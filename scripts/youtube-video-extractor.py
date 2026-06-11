#!/usr/bin/env python3
"""Extract metadata for one public YouTube video without downloading media."""

import json
import re
import sys
from datetime import datetime

import yt_dlp

VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def fail(message: str, code: int = 1) -> None:
    safe_message = " ".join(str(message).split())[:1000]
    print(f"YSM_ERROR:{json.dumps({'error': safe_message})}", file=sys.stderr)
    raise SystemExit(code)


def clean_date(value):
    if not value or not re.fullmatch(r"\d{8}", str(value)):
        return None
    try:
        return datetime.strptime(str(value), "%Y%m%d").date().isoformat()
    except ValueError:
        return None


def main():
    if len(sys.argv) != 2 or not VIDEO_ID.fullmatch(sys.argv[1]):
        fail("Expected a valid YouTube video ID.")

    video_id = sys.argv[1]
    url = f"https://www.youtube.com/watch?v={video_id}"
    options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "socket_timeout": 20,
        "retries": 2,
        "fragment_retries": 0,
        "noplaylist": True,
    }

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            entry = ydl.extract_info(url, download=False)
    except Exception as exc:
        fail(f"yt-dlp could not read this video: {exc}")
    if not entry or not entry.get("id"):
        fail("No video data was returned.")

    webpage_url = entry.get("webpage_url") or url
    video = {
        "id": str(entry.get("id") or video_id),
        "title": str(entry.get("title") or "Untitled video"),
        "description": str(entry.get("description") or ""),
        "url": str(webpage_url),
        "thumbnail": str(entry.get("thumbnail") or ""),
        "uploadDate": clean_date(entry.get("upload_date")),
        "duration": int(entry.get("duration") or 0),
        "views": int(entry.get("view_count") or 0),
        "channelName": str(entry.get("channel") or entry.get("uploader") or ""),
    }
    print(json.dumps({"video": video}, ensure_ascii=False))


if __name__ == "__main__":
    main()
