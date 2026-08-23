type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type CacheOptions = {
  fetcher?: FetchLike;
  timeoutMs?: number;
  retries?: number;
  ttlMs?: number;
};

type CacheEntry = { expiresAt: number; value: unknown };

export class CatalogProviderError extends Error {
  constructor(public readonly code: "timeout" | "rate-limit" | "upstream" | "offline", message: string) {
    super(message);
  }
}

export function createCachedFetcher(options: CacheOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const retries = options.retries ?? 1;
  const ttlMs = options.ttlMs ?? 15 * 60_000;
  const cache = new Map<string, CacheEntry>();

  return {
    async json<T>(key: string, url: string): Promise<T> {
      const hit = cache.get(key);
      if (hit && hit.expiresAt > Date.now()) return hit.value as T;
      let lastStatus = 0;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetcher(url, { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "CardTwin/1.0" } });
          lastStatus = response.status;
          if (response.ok) {
            const result = await response.json() as T;
            cache.set(key, { expiresAt: Date.now() + ttlMs, value: result });
            return result;
          }
          if (response.status !== 429 && response.status < 500) break;
        } catch (error) {
          if (attempt === retries) {
            throw new CatalogProviderError(error instanceof DOMException && error.name === "AbortError" ? "timeout" : "offline", "Catalog source is temporarily unavailable");
          }
        } finally {
          clearTimeout(timer);
        }
      }
      throw new CatalogProviderError(lastStatus === 429 ? "rate-limit" : "upstream", `Catalog source returned ${lastStatus || "an error"}`);
    },
  };
}
