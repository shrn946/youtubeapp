# YouTube SEO Manager

A production-oriented Next.js 15 dashboard that extracts public YouTube channel metadata with Python and `yt-dlp`, analyzes SEO quality, stores local editing drafts, and exports CSV/XLSX files.

Channel metadata is extracted in batches of 50. The first batch appears immediately, and each **Load Next 50** action appends the next batch without clearing drafts or selections.

## Requirements

- Node.js 20.9+
- Python 3.10+
- A current version of `yt-dlp`

## Setup

```bash
npm install
python -m pip install -r requirements.txt
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`.

## SQLite storage

The current workspace, extracted videos, SEO drafts, selections, extraction progress, and AI results are stored in SQLite through Prisma. IndexedDB remains as an offline browser fallback and existing browser data is copied to SQLite on the next workspace save.

Useful commands:

```bash
npm run db:generate
npm run db:migrate -- --name schema_update
npm run db:studio
```

`npm run db:studio` opens Prisma Studio for inspecting database rows. The local database file is `dev.db` and is excluded from Git.

If Python is not available as `python` on Windows or `python3` on Linux, set `PYTHON_BIN` to the absolute executable path.

## AI SEO Assistant

Copy `.env.example` to `.env.local` and add a Gemini API key:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash
```

Restart the Next.js server after changing environment variables. AI keys are read only by the server-side `/api/ai/seo` route and are never sent to the browser.
For thumbnail analysis, the server downloads the public YouTube thumbnail and sends its image bytes to the configured AI provider with the video metadata.

Available providers:

- `gemini`: implemented with structured JSON output.
- `openai`: placeholder for a future adapter.
- `mock`: deterministic local testing without an API key.

AI results are cached server-side for 24 hours and persisted in browser IndexedDB. Bulk generation runs two requests concurrently, retries failures once, and supports retrying failed videos.

Each AI package includes a primary keyword, secondary keywords, related searches, ten title options, formatted descriptions, tags, hashtags, verified related videos, a pinned comment, suggested chapters, CTR guidance, a thumbnail score with visual reasoning, a thumbnail-aware redesign prompt, and an SEO score.

## Production

```bash
npm run typecheck
npm run build
npm start
```

The host must permit Node.js to spawn the configured Python executable. Serverless platforms that disallow subprocesses are not compatible; use a Node container or VM.

Container deployment:

```bash
docker build -t youtube-seo-manager .
docker run --rm -p 3000:3000 youtube-seo-manager
```

## Security and data handling

- Only HTTPS URLs on known `youtube.com` hosts and channel-shaped paths are accepted.
- The Python command uses a fixed script path and argument array with `shell: false`.
- The child process receives a limited environment, has a ten-minute timeout, and enforces a 64 MB output limit.
- `yt-dlp` runs with `skip_download: true`; only metadata is requested.
- Results are held in a bounded in-memory cache for 15 minutes.
- Extraction is limited to sixty requests per client in a ten-minute window.
- CSV and XLSX exports are generated in the browser.
- AI exports are generated separately as `youtube-seo-ai-export.csv` and `youtube-seo-ai-export.xlsx`.

## AI assistant behavior

“Generate Better SEO” uses a deterministic local suggestion engine. It does not send channel metadata to a third-party model and requires no AI API key. Replace `generateSeoDraft` in `lib/seo.ts` with an authenticated server-side model call if generative AI is required.

Set `EXTRACT_TIMEOUT_MS` to tune the extractor timeout for your hosting environment.

For multi-instance deployments, replace the in-memory cache and rate limiter with Redis or another shared store.

## Notes

YouTube can change its public site behavior at any time. Keep `yt-dlp` current:

```bash
python -m pip install --upgrade yt-dlp
```
