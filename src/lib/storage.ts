import { AppData, createInitialData } from "../types";

const STORAGE_KEY = "nofap_reclaim_control_v1";

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppData>;
  return Boolean(
    candidate.preferences &&
    Array.isArray(candidate.challenges) &&
    candidate.dailyLogs &&
    typeof candidate.dailyLogs === "object" &&
    Array.isArray(candidate.journalEntries) &&
    Array.isArray(candidate.relapseEntries) &&
    Array.isArray(candidate.habits)
  );
}

export function loadLocalData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialData();
    const parsed: unknown = JSON.parse(raw);
    return isAppData(parsed) ? parsed : createInitialData();
  } catch {
    return createInitialData();
  }
}

export function saveLocalData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Could not save local NOFAP data.", error);
    throw new Error("Storage is full or unavailable. Export your data and try again.");
  }
}

export function exportData(data: AppData): void {
  const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nofap-personal-data-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  URL.revokeObjectURL(url);
}

export function clearLocalData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}