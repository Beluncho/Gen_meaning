import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { ParsedFeedItem } from '../shared/news.ts';

export interface ParsedRssFeed {
  title: string;
  link: string;
  language: string | null;
  items: ParsedFeedItem[];
}

export class RssParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RssParseError';
  }
}

const parser = new XMLParser({
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  ignoreAttributes: false,
  isArray: (name: string) => name === 'item' || name === 'category',
  parseTagValue: false,
  trimValues: false,
});

function textValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return textValue(value[0]);

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record.__cdata ?? record['#text']);
  }

  return '';
}

function itemArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return value && typeof value === 'object'
      ? [value as Record<string, unknown>]
      : [];
  }

  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object',
  );
}

function categoryValues(value: unknown): string[] {
  return itemArray(value)
    .map((category) => textValue(category))
    .concat(typeof value === 'string' ? [textValue(value)] : [])
    .filter(Boolean);
}

function parseItem(item: Record<string, unknown>): ParsedFeedItem {
  return {
    title: textValue(item.title),
    guid: textValue(item.guid),
    link: textValue(item.link),
    descriptionHtml: textValue(item.description),
    publishedAt: textValue(item.pubDate),
    author: textValue(item['dc:creator']) || textValue(item.creator) || null,
    categories: categoryValues(item.category),
  };
}

export function parseRssFeed(xml: string): ParsedRssFeed {
  if (!xml.trim()) throw new RssParseError('RSS response is empty');

  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new RssParseError(
      `Invalid RSS XML: ${validation.err?.msg || 'validation failed'}`,
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'parse failed';
    throw new RssParseError(`Unable to parse RSS XML: ${message}`);
  }

  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  if (!channel) throw new RssParseError('RSS channel was not found');

  return {
    title: textValue(channel.title),
    link: textValue(channel.link),
    language: textValue(channel.language) || null,
    items: itemArray(channel.item).map(parseItem),
  };
}
