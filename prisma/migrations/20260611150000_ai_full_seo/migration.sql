-- AlterTable
ALTER TABLE "AiSeoResult" ADD COLUMN "primaryKeyword" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiSeoResult" ADD COLUMN "secondaryKeywords" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "AiSeoResult" ADD COLUMN "relatedSearchKeywords" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "AiSeoResult" ADD COLUMN "relatedVideoSuggestions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "AiSeoResult" ADD COLUMN "pinnedComment" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiSeoResult" ADD COLUMN "chapters" JSONB NOT NULL DEFAULT '[]';
