const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const USER_AGENT = 'GenMeaning/0.1 (+news-reader; RSS ingestion)';

export interface FeedClientOptions {
  timeoutMs?: number;
  retries?: number;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchRss(
  url: string,
  options: FeedClientOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/rss+xml, application/xml, text/xml;q=0.9',
          'user-agent': USER_AGENT,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`RSS request failed with HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await wait(500 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : 'Unknown RSS request error';
  throw new Error(`Unable to fetch RSS feed: ${message}`);
}
