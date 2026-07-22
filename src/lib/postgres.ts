import "server-only";

import postgres, { type Sql } from "postgres";

declare global {
  var aviationWikiSql: Sql | undefined;
  var aviationWikiSchemaReady: Promise<void> | undefined;
}

function connectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required.");
  return value;
}

export const sql =
  globalThis.aviationWikiSql ??
  postgres(connectionString(), {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalThis.aviationWikiSql = sql;

async function createSchema() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS articles (
      id text PRIMARY KEY,
      slug text NOT NULL,
      title text NOT NULL,
      content_type text NOT NULL CHECK (content_type IN ('airline','aircraft','airport','manufacturer','engine','country')),
      live_revision_id text,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      protection_level text NOT NULL DEFAULT 'open',
      is_locked boolean NOT NULL DEFAULT false,
      archived_at timestamptz,
      redirect_to_slug text,
      UNIQUE(content_type, slug)
    );
    CREATE TABLE IF NOT EXISTS revisions (
      id text PRIMARY KEY,
      article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      status text NOT NULL CHECK (status IN ('draft','verifying','pending_review','changes_requested','approved','rejected')),
      contributor_id text NOT NULL,
      contributor_name text NOT NULL,
      edit_summary text NOT NULL,
      title text NOT NULL,
      content_type text NOT NULL CHECK (content_type IN ('airline','aircraft','airport','manufacturer','engine','country')),
      markdown text NOT NULL DEFAULT '',
      fields_json jsonb NOT NULL DEFAULT '[]',
      sections_json jsonb NOT NULL DEFAULT '[]',
      sources_json jsonb NOT NULL DEFAULT '[]',
      relationships_json jsonb NOT NULL DEFAULT '[]',
      verification_json jsonb,
      moderator_id text,
      moderator_note text,
      assigned_moderator_id text,
      proposed_slug text NOT NULL DEFAULT '',
      parent_revision_id text,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      submitted_at timestamptz,
      reviewed_at timestamptz
    );
    ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_live_revision_id_fkey;
    ALTER TABLE articles ADD CONSTRAINT articles_live_revision_id_fkey FOREIGN KEY (live_revision_id) REFERENCES revisions(id) DEFERRABLE INITIALLY DEFERRED;
    CREATE INDEX IF NOT EXISTS revisions_article_idx ON revisions(article_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS revisions_status_idx ON revisions(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS revisions_contributor_idx ON revisions(contributor_id, updated_at DESC);
    CREATE TABLE IF NOT EXISTS revision_events (id text PRIMARY KEY, revision_id text NOT NULL REFERENCES revisions(id) ON DELETE CASCADE, actor_id text NOT NULL, from_status text, to_status text NOT NULL, note text, created_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS article_slug_redirects (content_type text NOT NULL, old_slug text NOT NULL, article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL, PRIMARY KEY(content_type,old_slug));
    CREATE TABLE IF NOT EXISTS article_relationships (source_article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE, target_article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE, relationship_type text NOT NULL, approved_revision_id text NOT NULL REFERENCES revisions(id), created_at timestamptz NOT NULL, PRIMARY KEY(source_article_id,relationship_type,target_article_id), CHECK(source_article_id<>target_article_id));
    CREATE INDEX IF NOT EXISTS article_relationships_target_idx ON article_relationships(target_article_id,relationship_type);
    CREATE TABLE IF NOT EXISTS article_external_identifiers (provider text NOT NULL, source_identifier text NOT NULL, article_id text NOT NULL REFERENCES articles(id), created_at timestamptz NOT NULL, PRIMARY KEY(provider,source_identifier));
    CREATE TABLE IF NOT EXISTS import_history (id text PRIMARY KEY, actor_id text NOT NULL, actor_name text NOT NULL, provider text NOT NULL, source_identifiers_json jsonb NOT NULL, article_id text NOT NULL REFERENCES articles(id), revision_id text NOT NULL REFERENCES revisions(id), created_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS revision_import_field_sources (revision_id text NOT NULL REFERENCES revisions(id) ON DELETE CASCADE, field_key text NOT NULL, field_value text NOT NULL, provider text NOT NULL, source_identifier text NOT NULL, source_urls_json jsonb NOT NULL, PRIMARY KEY(revision_id,field_key));
    CREATE TABLE IF NOT EXISTS revision_import_images (revision_id text NOT NULL REFERENCES revisions(id) ON DELETE CASCADE, file_name text NOT NULL, image_url text NOT NULL, thumbnail_url text NOT NULL, creator text NOT NULL, license text NOT NULL, license_url text NOT NULL, attribution text NOT NULL, source_page text NOT NULL, retrieved_at timestamptz NOT NULL, PRIMARY KEY(revision_id,source_page));
    CREATE TABLE IF NOT EXISTS contributor_profiles (user_id text PRIMARY KEY, moderator_notes text NOT NULL DEFAULT '', restriction text NOT NULL DEFAULT 'none', trusted boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS revision_private_notes (id text PRIMARY KEY, revision_id text NOT NULL REFERENCES revisions(id), moderator_id text NOT NULL, moderator_name text NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS source_checks (url text PRIMARY KEY, status text NOT NULL, strength text NOT NULL, note text NOT NULL DEFAULT '', checked_by text NOT NULL, checked_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_audit_log (id text PRIMARY KEY, actor_id text NOT NULL, actor_name text NOT NULL, action text NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL, article_id text, revision_id text, before_json jsonb, after_json jsonb, created_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (id text PRIMARY KEY, user_id text NOT NULL, type text NOT NULL, title text NOT NULL, message text NOT NULL, href text NOT NULL, article_id text, revision_id text, dedupe_key text NOT NULL UNIQUE, read_at timestamptz, created_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS notification_preferences (user_id text PRIMARY KEY, email_frequency text NOT NULL DEFAULT 'in_app', enabled_types_json jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS article_watches (user_id text NOT NULL, article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL, PRIMARY KEY(user_id,article_id));
    CREATE TABLE IF NOT EXISTS notification_email_deliveries (id text PRIMARY KEY, notification_id text NOT NULL UNIQUE REFERENCES notifications(id) ON DELETE CASCADE, user_id text NOT NULL, status text NOT NULL, provider_message_id text, failure_reason text, retry_count integer NOT NULL DEFAULT 0, next_attempt_at timestamptz, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL);
  `);
}

export function ensureSchema() {
  globalThis.aviationWikiSchemaReady ??= createSchema();
  return globalThis.aviationWikiSchemaReady;
}

export async function rows<T extends Record<string, unknown>>(query: string, params: unknown[] = []) {
  await ensureSchema();
  return (await sql.unsafe(query, params as never[])) as unknown as T[];
}

export async function row<T extends Record<string, unknown>>(query: string, params: unknown[] = []) {
  return (await rows<T>(query, params))[0];
}
