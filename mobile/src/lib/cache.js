/**
 * Simple offline cache using expo-file-system.
 * Falls back to in-memory if FileSystem is unavailable.
 * Used for job feed and worker list so the app shows something on no-internet.
 */
import * as FileSystem from "expo-file-system";

const DIR = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}kn_cache/` : null;

async function ensureDir() {
  if (!DIR) return;
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  } catch {}
}

export async function setCache(key, data) {
  if (!DIR) return;
  try {
    await ensureDir();
    await FileSystem.writeAsStringAsync(`${DIR}${key}.json`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export async function getCache(key, maxAgeMs = 30 * 60 * 1000) {
  if (!DIR) return null;
  try {
    const path = `${DIR}${key}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > maxAgeMs) return null;
    return data;
  } catch { return null; }
}
