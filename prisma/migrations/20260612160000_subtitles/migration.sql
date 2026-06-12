CREATE TABLE "Subtitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "srt" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "generatedAt" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subtitle_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Subtitle_videoId_language_key" ON "Subtitle"("videoId", "language");
CREATE INDEX "Subtitle_videoId_idx" ON "Subtitle"("videoId");
