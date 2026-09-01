// Real-time EN<->HI/Santali translation via MyMemory's free, keyless
// translation API (https://mymemory.translated.net) — an open translation-
// memory + MT service, CORS-enabled, no server/API key required. Results are
// cached in localStorage so a given string is only ever fetched once per
// browser, forever. "sat" (Santali, ISO 639-3) returns Ol Chiki script;
// verified against MyMemory directly — it falls back to real MT for novel
// sentences, not just canned phrase lookups.
export type LiveLang = "en" | "hi" | "sat";

const CACHE_KEY = "samadhan-translate-cache-v1";
const MAX_CONCURRENT = 4;

type CacheMap = Record<string, string>;

function loadCache(): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

const cache: CacheMap = loadCache();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistCache() {
  if (persistTimer || typeof window === "undefined") return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // storage full/unavailable — in-memory cache still works for this session
    }
  }, 500);
}

function cacheKey(text: string, source: LiveLang, target: LiveLang) {
  return `${source}|${target}|${text}`;
}

let active = 0;
const queue: Array<() => void> = [];

function runNext() {
  if (active >= MAX_CONCURRENT) return;
  const job = queue.shift();
  if (!job) return;
  active++;
  job();
}

function schedule(job: () => Promise<void>) {
  queue.push(() => {
    job().finally(() => {
      active--;
      runNext();
    });
  });
  runNext();
}

const inFlight = new Map<string, Promise<string>>();

/**
 * Only text containing Latin letters is a candidate: that's what "still
 * English" looks like. Text already in Devanagari (e.g. rendered by the
 * static i18n dictionaries) must NOT match here — treating already-Hindi
 * text as translatable causes it to be cached as the "original" for
 * restore-to-English, corrupting the restore.
 */
export function shouldTranslate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^[\d\s.,:%+\-/()]+$/.test(trimmed)) return false;
  return true;
}

export function getCached(
  text: string,
  source: LiveLang,
  target: LiveLang
): string | undefined {
  return cache[cacheKey(text, source, target)];
}

export function translateText(
  text: string,
  source: LiveLang,
  target: LiveLang
): Promise<string> {
  if (source === target) return Promise.resolve(text);
  const key = cacheKey(text, source, target);
  const cached = cache[key];
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = new Promise<string>(resolve => {
    schedule(async () => {
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            text
          )}&langpair=${source}|${target}`
        );
        if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
        const data = await res.json();
        const translated: string | undefined =
          data?.responseData?.translatedText;
        if (translated && translated.trim() && data.responseStatus !== 403) {
          cache[key] = translated;
          persistCache();
          resolve(translated);
        } else {
          resolve(text);
        }
      } catch {
        resolve(text); // network/API failure — fall back to the original string, never break the UI
      }
    });
  });
  inFlight.set(key, promise);
  promise.finally(() => inFlight.delete(key));
  return promise;
}
