// Browser-side media helpers: IndexedDB storage for large files, audio decoding and analysis.
import { detectBeats, waveformPeaks, type BeatAnalysis } from '../audio/beatDetection';

const DB_NAME = 'invite-studio';
const STORE = 'media';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

export interface DecodedAudio {
  mono: Float32Array;
  sampleRate: number;
  duration: number;
}

/** Decodes any browser-supported audio file without needing a user gesture. */
export async function decodeAudio(data: ArrayBuffer): Promise<DecodedAudio> {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const buffer = await ctx.decodeAudioData(data);
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / buffer.numberOfChannels;
  }
  return { mono, sampleRate: buffer.sampleRate, duration: buffer.duration };
}

export interface AudioInsight {
  duration: number;
  peaks: Float32Array;
  analysis: BeatAnalysis;
}

const cache = new Map<string, Promise<AudioInsight>>();

/** Decodes, draws the waveform and detects beats (memoized per URL / file). */
export function analyzeAudio(key: string, load: () => Promise<ArrayBuffer>, beatsPerBar = 4): Promise<AudioInsight> {
  const cacheKey = `${key}|${beatsPerBar}`;
  let p = cache.get(cacheKey);
  if (!p) {
    p = (async () => {
      const decoded = await decodeAudio(await load());
      // Yield so the UI can show the "analyzing" state before the CPU-heavy part.
      await new Promise((r) => setTimeout(r, 0));
      const analysis = detectBeats(decoded.mono, decoded.sampleRate, { beatsPerBar });
      return { duration: decoded.duration, peaks: waveformPeaks(decoded.mono, 3000), analysis };
    })();
    cache.set(cacheKey, p);
    p.catch(() => cache.delete(cacheKey));
  }
  return p;
}

export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
