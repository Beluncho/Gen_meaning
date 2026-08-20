import { createHash } from 'node:crypto';
import type {
  NormalizedArticle,
  ParsedFeedItem,
} from '../shared/news.ts';

const HABR_HOSTS = new Set(['habr.com', 'www.habr.com']);
const MAX_SUMMARY_LENGTH = 4_000;

const namedHtmlEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  hellip: '…',
  laquo: '«',
  ldquo: '“',
  mdash: '—',
  nbsp: '\u00a0',
  ndash: '–',
  quot: '"',
  raquo: '»',
  rdquo: '”',
  rsquo: '’',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi,
    (entity, reference: string) => {
      if (reference.startsWith('#x') || reference.startsWith('#X')) {
        return String.fromCodePoint(Number.parseInt(reference.slice(2), 16));
      }

      if (reference.startsWith('#')) {
        return String.fromCodePoint(Number.parseInt(reference.slice(1), 10));
      }

      return namedHtmlEntities[reference.toLowerCase()] || entity;
    },
  );
}

function normalizeWhitespace(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeAttribute(value: string): string {
  return normalizeWhitespace(value);
}

function isHabrUrl(value: string): boolean {
  try {
    return HABR_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function removeTrackingParameters(url: URL): string {
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_')) {
      url.searchParams.delete(key);
    }
  }

  url.hash = '';
  return url.toString();
}

export function canonicalizeUrl(value: string, base = 'https://habr.com/'): string {
  const url = new URL(value, base);
  return removeTrackingParameters(url);
}

export function extractExternalLinks(html: string): string[] {
  const links = new Set<string>();
  const anchorPattern =
    /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeAttribute(match[1] ?? match[2] ?? '');
    if (!href || /habracut/i.test(href)) continue;

    try {
      const url = new URL(href, 'https://habr.com/');
      if (!isHabrUrl(url.toString()) && url.hostname !== 'habrastorage.org') {
        links.add(url.toString());
      }
    } catch {
      continue;
    }
  }

  return [...links];
}

export function htmlToPlainText(html: string): string {
  const withoutUnsafeTags = html
    .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(
      /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>[\s\S]*?<\/a>/gi,
      (anchor, firstHref: string, secondHref: string) =>
        /habracut/i.test(firstHref || secondHref || '') ? '' : anchor,
    )
    .replace(
      /<\/?(?:p|div|li|br|h[1-6]|blockquote|pre|tr)[^>]*>/gi,
      '\n',
    )
    .replace(/<[^>]+>/g, '');

  return normalizeWhitespace(withoutUnsafeTags)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^читать далее$/i.test(line))
    .join('\n')
    .slice(0, MAX_SUMMARY_LENGTH)
    .trim();
}

function normalizeAuthor(author: string | null): string | null {
  const normalized = author ? normalizeWhitespace(author) : '';
  return normalized || null;
}

function parsePublishedAt(value: string): string | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function stableSourceGuid(item: ParsedFeedItem, sourceUrl: string): string {
  return normalizeWhitespace(item.guid) || sourceUrl;
}

export function normalizeFeedItem(
  item: ParsedFeedItem,
): NormalizedArticle | null {
  const title = normalizeWhitespace(item.title);
  const sourceUrlRaw = item.guid || item.link;
  const summary = htmlToPlainText(item.descriptionHtml);
  const publishedAt = parsePublishedAt(item.publishedAt);

  if (!title || !sourceUrlRaw || !summary || !publishedAt) return null;

  let sourceUrl: string;
  try {
    sourceUrl = canonicalizeUrl(sourceUrlRaw);
  } catch {
    return null;
  }

  const sourceGuid = stableSourceGuid(item, sourceUrl);
  const categories = [...new Set(item.categories.map(normalizeWhitespace))]
    .filter(Boolean)
    .slice(0, 50);
  const externalLinks = extractExternalLinks(item.descriptionHtml);
  const sourceHash = createHash('sha256')
    .update(`${title}\n${summary}`, 'utf8')
    .digest('hex');

  return {
    source: 'habr-ai',
    sourceGuid,
    sourceUrl,
    title,
    summary,
    author: normalizeAuthor(item.author),
    publishedAt,
    categories,
    externalLinks,
    rawPayload: {
      sourceGuid,
      sourceUrl,
      categories,
      externalLinks,
    },
    sourceHash,
  };
}
