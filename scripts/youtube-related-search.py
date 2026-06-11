#!/usr/bin/env python3
"""Search public YouTube video metadata without downloading media."""

import json
import re
import sys
from datetime import datetime

import yt_dlp


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
    if len(sys.argv) != 2:
        fail("Expected a YouTube search query.")
    query = " ".join(sys.argv[1].split())
    if len(query) < 3 or len(query) > 300:
        fail("Invalid YouTube search query.")

    options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "ignoreerrors": True,
        "socket_timeout": 20,
        "retries": 2,
        "fragment_retries": 0,
        "noplaylist": True,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(f"ytsearch30:{query}", download=False)
    except Exception as exc:
        fail(f"yt-dlp could not search YouTube: {exc}")

    videos = []
    for entry in (info or {}).get("entries") or []:
        if not entry or not entry.get("id"):
            continue
        video_id = str(entry.get("id"))
        videos.append({
            "id": video_id,
            "title": str(entry.get("title") or "Untitled video"),
            "description": str(entry.get("description") or ""),
            "url": str(entry.get("webpage_url") or f"https://www.youtube.com/watch?v={video_id}"),
            "thumbnail": str(entry.get("thumbnail") or ""),
            "uploadDate": clean_date(entry.get("upload_date")),
            "views": int(entry.get("view_count") or 0),
            "channelName": str(entry.get("channel") or entry.get("uploader") or ""),
        })
    print(json.dumps({"videos": videos}, ensure_ascii=False))


if __name__ == "__main__":
    main()
