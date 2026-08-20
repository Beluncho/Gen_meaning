# Source Reconnaissance

## Source

- Site: Habr
- Section: Artificial Intelligence / News
- RSS: `https://habr.com/ru/rss/hubs/artificial_intelligence/news/?fl=ru`
- Checked: August 18, 2026

## HTTP response

- Status: `200`
- Content type: `text/xml; charset=utf-8`
- Root element: `<rss version="2.0">`
- Namespace: `dc="http://purl.org/dc/elements/1.1/"`

## Observed channel fields

- `title`
- `link`
- `description`
- `language`
- `pubDate`
- `image`
- `generator`

The channel is Russian-language and identifies Habr as the generator.

## Observed item fields

The checked response contains 40 `<item>` records. Every record has all of the
following fields:

- `title` as CDATA text;
- `guid` with `isPermaLink="true"` and a canonical Habr news URL;
- `link` with a Habr URL and RSS tracking query parameters;
- `description` as CDATA containing HTML;
- `pubDate` in RFC 822 format with a GMT timezone;
- `dc:creator` as CDATA text;
- one or more `category` elements as CDATA text.

Every item has an HTML description. Depending on the item, it may include
`img`, `p`, `a`, `br`, and `code` elements. Descriptions also contain a
`Читать далее` link and may include links to the external source of the news.

## Mapper implications

The general RSS ingestion design does not need to change:

1. Parse XML and validate the channel.
2. Map `guid` to `source_guid`.
3. Use the `guid` URL as the canonical source URL when available.
4. Remove RSS tracking parameters from the display URL.
5. Convert the description HTML to bounded plain text.
6. Remove the image and `Читать далее` link from the stored summary.
7. Extract external links separately for provenance.
8. Parse `pubDate` into UTC and preserve the original timestamp.
9. Map `dc:creator` to `author` and all `category` elements to an array.

The first 10 records are sufficient for the assignment requirement. The
ingestion command should still fetch and persist the complete valid RSS page,
then expose at least 10 records through the API.

## Content policy

The application should display Habr attribution and the original article link.
It should store only the bounded RSS title and summary needed for the assignment,
not the complete article body or RSS images. The full Habr page remains the
canonical source for reading the original material.
