"use client";

import type { SavedWorkspace } from "@/types/video";

const DB_NAME = "youtube-seo-manager";
const STORE_NAME = "workspace";
const DB_VERSION = 2;
const WORKSPACE_KEY = "current";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("ai-results")) {
        database.createObjectStore("ai-results");
      }
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadBrowserWorkspace(): Promise<SavedWorkspace | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY);
    request.onsuccess = () => resolve((request.result as SavedWorkspace | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function saveBrowserWorkspace(workspace: SavedWorkspace): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(workspace, WORKSPACE_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadWorkspace(): Promise<SavedWorkspace | null> {
  try {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json() as { workspace: SavedWorkspace | null };
      if (data.workspace) {
        await saveBrowserWorkspace(data.workspace);
        return data.workspace;
      }
    }
  } catch {
    // IndexedDB remains available when the server database is offline.
  }
  return loadBrowserWorkspace();
}

export async function saveWorkspace(workspace: SavedWorkspace): Promise<void> {
  await saveBrowserWorkspace(workspace);
  const response = await fetch("/api/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(workspace),
  });
  if (!response.ok) throw new Error("SQLite workspace save failed.");
}
