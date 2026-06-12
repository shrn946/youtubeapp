export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  uploadDate: string | null;
  duration: number;
  views: number;
  channelName: string;
}

export interface VideoDraft {
  title: string;
  description: string;
}

export interface AiSeoInput {
  title: string;
  description: string;
  channelName: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  relatedVideos?: Array<{
    title: string;
    url: string;
  }>;
  protectedLinks?: string[];
}

export interface AiSeoResult {
  seoTitle: string;
  seoDescription: string;
  titleOptions: string[];
  descriptionOptions: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  relatedSearchKeywords: string[];
  bestTitleIndex: number;
  bestTitleReason: string;
  bestDescriptionIndex: number;
  bestDescriptionReason: string;
  tags: string[];
  keywords: string[];
  hashtags: string[];
  relatedVideoSuggestions: Array<{
    title: string;
    url: string;
  }>;
  pinnedComment: string;
  chapters: Array<{
    timestamp: string;
    title: string;
  }>;
  ctrSuggestions: string[];
  thumbnailScore: number;
  thumbnailScoreReason: string;
  thumbnailRedesignPrompt: string;
  seoScore: number;
  provider: string;
  generatedAt: string;
}

export interface SubtitleResult {
  videoId: string;
  language: string;
  srt: string;
  filename: string;
  source: "transcript" | "metadata";
  provider: string;
  generatedAt: string;
}

export interface SeoAnalysis {
  score: number;
  titleScore: number;
  descriptionScore: number;
  suggestions: string[];
}

export type SortKey = "uploadDate" | "views" | "title" | "seoScore";
export type SortDirection = "asc" | "desc";

export interface ExtractResponse {
  channelName: string;
  total: number;
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  cached: boolean;
  videos: Video[];
}

export interface SavedWorkspace {
  videos: Video[];
  drafts: Record<string, VideoDraft>;
  selectedIds: string[];
  activeId: string | null;
  sourceUrl: string;
  totalAvailable: number;
  nextOffset: number;
  hasMore: boolean;
}
