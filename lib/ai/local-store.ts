"use client";

import type { AiSeoResult } from "@/types/video";

const DB_NAME = "youtube-seo-manager";
const STORE_NAME = "ai-results";
const DB_VERSION = 2;

function normalizeResult(result: AiSeoResult): AiSeoResult {
  const primaryKeyword = result.primaryKeyword || result.keywords?.[0] || "";
  return {
    ...result,
    titleOptions: result.titleOptions?.slice(0, 10) ?? [],
    primaryKeyword,
    secondaryKeywords: result.secondaryKeywords ?? result.keywords?.slice(1, 7) ?? [],
    relatedSearchKeywords: result.relatedSearchKeywords ?? [],
    bestTitleIndex: Number.isInteger(result.bestTitleIndex) ? result.bestTitleIndex : 0,
    bestTitleReason: result.bestTitleReason || "Regenerate this video to receive an AI recommendation reason.",
    bestDescriptionIndex: Number.isInteger(result.bestDescriptionIndex) ? result.bestDescriptionIndex : 0,
    bestDescriptionReason: result.bestDescriptionReason || "Regenerate this video to receive an AI recommendation reason.",
    relatedVideoSuggestions: result.relatedVideoSuggestions ?? [],
    pinnedComment: result.pinnedComment ?? "",
    chapters: result.chapters ?? [],
    thumbnailScore: Number.isInteger(result.thumbnailScore) ? result.thumbnailScore : 0,
    thumbnailScoreReason: result.thumbnailScoreReason
      || "Regenerate this video to evaluate the current thumbnail.",
    thumbnailRedesignPrompt: result.thumbnailRedesignPrompt
      || "Regenerate this video to create a thumbnail redesign prompt.",
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
      if (!database.objectStoreNames.contains("workspace")) {
        database.createObjectStore("workspace");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadBrowserAiResults(): Promise<Record<string, AiSeoResult>> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const keysRequest = store.getAllKeys();
    const valuesRequest = store.getAll();
    transaction.oncomplete = () => {
      const results: Record<string, AiSeoResult> = {};
      keysRequest.result.forEach((key, index) => {
        results[String(key)] = normalizeResult(valuesRequest.result[index] as AiSeoResult);
      });
      database.close();
      resolve(results);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

async function saveBrowserAiResult(videoId: string, result: AiSeoResult): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(result, videoId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadAiResults(): Promise<Record<string, AiSeoResult>> {
  try {
    const response = await fetch("/api/ai/results", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json() as { results: Record<string, AiSeoResult> };
      await Promise.all(Object.entries(data.results).map(([videoId, result]) => saveBrowserAiResult(videoId, result)));
      return Object.fromEntries(
        Object.entries(data.results).map(([videoId, result]) => [videoId, normalizeResult(result)]),
      );
    }
  } catch {
    // IndexedDB remains available when the server database is offline.
  }
  return loadBrowserAiResults();
}

export async function saveAiResult(videoId: string, result: AiSeoResult): Promise<void> {
  await saveBrowserAiResult(videoId, result);
  const response = await fetch("/api/ai/results", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId, result }),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error("SQLite AI result save failed.");
  }
}
