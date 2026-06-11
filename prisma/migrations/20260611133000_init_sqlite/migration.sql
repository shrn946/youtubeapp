-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "activeVideoId" TEXT,
    "selectedIds" JSONB NOT NULL,
    "totalAvailable" INTEGER NOT NULL DEFAULT 0,
    "nextOffset" INTEGER NOT NULL DEFAULT 0,
    "hasMore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "uploadDate" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "views" REAL NOT NULL DEFAULT 0,
    "channelName" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Video_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeoDraft" (
    "videoId" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeoDraft_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiSeoResult" (
    "videoId" TEXT NOT NULL PRIMARY KEY,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "titleOptions" JSONB NOT NULL,
    "descriptionOptions" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "keywords" JSONB NOT NULL,
    "hashtags" JSONB NOT NULL,
    "ctrSuggestions" JSONB NOT NULL,
    "seoScore" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "generatedAt" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiSeoResult_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Video_workspaceId_position_idx" ON "Video"("workspaceId", "position");

-- CreateIndex
CREATE INDEX "Video_channelName_idx" ON "Video"("channelName");
