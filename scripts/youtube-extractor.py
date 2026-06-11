#!/usr/bin/env python3
"""Extract public YouTube channel metadata without downloading media."""

import json
import re
import sys
from datetime import datetime
from urllib.parse import urlparse

import yt_dlp

ALLOWED_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com"}
ALLOWED_PATH = re.compile(
    r"^/(?:@[\w.-]+|channel/[\w-]+|c/[\w.-]+|user/[\w.-]+)(?:/videos)?/?$",
    re.IGNORECASE,
)


def fail(message: str, code: int = 1) -> None:
    safe_message = " ".join(str(message).split())[:1000]
    print(f"YSM_ERROR:{json.dumps({'error': safe_message})}", file=sys.stderr)
    raise SystemExit(code)


def validate_url(raw: str) -> str:
    if len(raw) > 500:
        fail("URL is too long.")
    parsed = urlparse(raw)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        fail("Only HTTPS youtube.com channel URLs are allowed.")
    if parsed.username or parsed.password or parsed.port or not ALLOWED_PATH.fullmatch(parsed.path):
        fail("Invalid YouTube channel path.")
    return raw


def clean_date(value):
    if not value or not re.fullmatch(r"\d{8}", str(value)):
        return None
    try:
        return datetime.strptime(str(value), "%Y%m%d").date().isoformat()
    except ValueError:
        return None


def clean_video(entry, channel_name):
    video_id = str(entry.get("id") or "")
    webpage_url = entry.get("webpage_url") or entry.get("url") or ""
    if video_id and not str(webpage_url).startswith("http"):
        webpage_url = f"https://www.youtube.com/watch?v={video_id}"
    return {
        "id": video_id,
        "title": str(entry.get("title") or "Untitled video"),
        "description": str(entry.get("description") or ""),
        "url": str(webpage_url),
        "thumbnail": str(entry.get("thumbnail") or ""),
        "uploadDate": clean_date(entry.get("upload_date")),
        "duration": int(entry.get("duration") or 0),
        "views": int(entry.get("view_count") or 0),
        "channelName": str(entry.get("channel") or entry.get("uploader") or channel_name or ""),
    }


def main():
    if len(sys.argv) != 4:
        fail("Expected a channel URL, offset, and limit.")
    channel_url = validate_url(sys.argv[1])
    try:
        offset = int(sys.argv[2])
        limit = int(sys.argv[3])
    except ValueError:
        fail("Offset and limit must be numbers.")
    if offset < 0 or offset > 10000 or limit < 1 or limit > 50:
        fail("Invalid extraction range.")

    playlist_items = ",".join(str(index) for index in range(offset + 1, offset + limit + 1))
    options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "ignoreerrors": True,
        "playlist_items": playlist_items,
        "socket_timeout": 20,
        "retries": 2,
        "fragment_retries": 0,
        "noplaylist": False,
    }

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(channel_url, download=False)
    except Exception as exc:
        fail(f"yt-dlp could not read this channel: {exc}")
    if not info:
        fail("No channel data was returned.")

    channel_name = info.get("channel") or info.get("uploader") or info.get("title") or ""
    videos = [
        clean_video(entry, channel_name)
        for entry in (info.get("entries") or [])
        if entry and entry.get("id")
    ]
    reported_total = info.get("playlist_count") or info.get("n_entries") or 0
    try:
        total = max(int(reported_total), offset + len(videos))
    except (TypeError, ValueError):
        total = offset + len(videos)
    has_more = (total > offset + len(videos)) if reported_total else len(videos) == limit
    next_offset = offset + limit if has_more else offset + len(videos)
    print(json.dumps({
        "channelName": channel_name,
        "total": total,
        "offset": offset,
        "nextOffset": next_offset,
        "hasMore": has_more,
        "videos": videos,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
