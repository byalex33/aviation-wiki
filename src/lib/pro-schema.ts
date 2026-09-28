export const PRO_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS saved_collections (
    id text PRIMARY KEY, user_id text NOT NULL, name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    created_at timestamptz NOT NULL DEFAULT NOW(), UNIQUE(user_id, name)
  );
  CREATE TABLE IF NOT EXISTS saved_collection_articles (
    collection_id text NOT NULL REFERENCES saved_collections(id) ON DELETE CASCADE,
    article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT NOW(), PRIMARY KEY(collection_id, article_id)
  );
  CREATE TABLE IF NOT EXISTS article_watch_alerts (
    user_id text NOT NULL, article_id text NOT NULL, edits boolean NOT NULL DEFAULT true,
    sources boolean NOT NULL DEFAULT false, relationships boolean NOT NULL DEFAULT false,
    PRIMARY KEY(user_id, article_id),
    FOREIGN KEY(user_id, article_id) REFERENCES article_watches(user_id, article_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS article_watch_alerts_article_idx ON article_watch_alerts(article_id);
`;
