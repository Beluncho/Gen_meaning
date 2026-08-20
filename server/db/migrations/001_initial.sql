CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_guid TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  author TEXT,
  published_at TEXT NOT NULL,
  categories_json TEXT NOT NULL DEFAULT '[]',
  external_links_json TEXT NOT NULL DEFAULT '[]',
  raw_payload_json TEXT,
  source_hash TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (source, source_guid),
  UNIQUE (source_url)
);

CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON articles (published_at DESC);

CREATE TABLE IF NOT EXISTS rewrites (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  tone TEXT NOT NULL,
  custom_style TEXT,
  rewritten_title TEXT NOT NULL,
  rewritten_summary TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  validation_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rewrites_article
  ON rewrites (article_id, tone, source_hash);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT
);
