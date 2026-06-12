import json
import sys
import urllib.request

import yt_dlp


def fail(message):
    print(json.dumps({"error": message}, ensure_ascii=False))
    sys.exit(1)


def select_track(info, language):
    for source_name in ("subtitles", "automatic_captions"):
        source = info.get(source_name) or {}
        candidates = [language, f"{language}-orig"]
        candidates.extend(key for key in source if key.startswith(f"{language}-"))
        for key in candidates:
            formats = source.get(key) or []
            for extension in ("json3", "srv3", "vtt"):
                match = next((item for item in formats if item.get("ext") == extension and item.get("url")), None)
                if match:
                    return match, source_name
    return None, None


def json3_segments(payload):
    segments = []
    for event in payload.get("events") or []:
        text = "".join(segment.get("utf8", "") for segment in event.get("segs") or [])
        text = " ".join(text.replace("\n", " ").split())
        if text:
            segments.append({
                "startMs": int(event.get("tStartMs") or 0),
                "durationMs": int(event.get("dDurationMs") or 0),
                "text": text,
            })
    return segments


def main():
    if len(sys.argv) != 3:
        fail("Video ID and language are required.")
    video_id, language = sys.argv[1], sys.argv[2]
    if len(video_id) != 11:
        fail("Invalid video ID.")

    options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "socket_timeout": 20,
    }
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)

    track, source = select_track(info, language)
    if not track:
        print(json.dumps({"segments": [], "source": "none"}))
        return

    request = urllib.request.Request(track["url"], headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read()
    if track.get("ext") != "json3":
        print(json.dumps({"segments": [], "source": "none"}))
        return

    payload = json.loads(body.decode("utf-8"))
    print(json.dumps({"segments": json3_segments(payload), "source": source}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        fail(str(error))
