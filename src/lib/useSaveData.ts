"use client";

/**
 * React hook for the device save (localStorage).
 * Uses React's built-in useSyncExternalStore: on the server (and during the
 * first paint) the save is `null`, then the real data appears in the browser.
 */
import { useCallback, useSyncExternalStore } from "react";
import { loadSave, writeSave, type SaveData } from "@/game/storage";

let cache: SaveData | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SaveData {
  cache ??= loadSave(storage());
  return cache;
}

function getServerSnapshot(): SaveData | null {
  return null;
}

/** The current save, for code outside React (e.g. the leaderboard sync). */
export function getSave(): SaveData {
  return getSnapshot();
}

/** Changes the save, writes it to the device and re-renders the screens. */
export function updateSave(change: (d: SaveData) => SaveData): void {
  const next = change(getSnapshot());
  if (next === cache) return;
  cache = next;
  writeSave(storage(), cache);
  listeners.forEach((l) => l());
}

export function useSaveData(): [
  SaveData | null,
  (change: (d: SaveData) => SaveData) => void,
] {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const update = useCallback(
    (change: (d: SaveData) => SaveData) => updateSave(change),
    [],
  );
  return [data, update];
}

/** Test helper: forget the cached save. */
export function resetSaveCacheForTests() {
  cache = null;
}
