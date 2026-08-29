import "server-only";

import postgres, { type Sql } from "postgres";

declare global {
  var aviationWikiSql: Sql | undefined;
  var aviationWikiSchemaReady: Promise<void> | undefined;
}

function connectionString() {
  // Not thrown at module load: importing this file (e.g. while Next collects
  // page data for /_not-found during a preview build without database env)
  // must not crash. A missing URL surfaces as a connection error on first query.
  return process.env.DATABASE_URL ?? "";
}

function poolSize() {
  const configured = Number.parseInt(process.env.DATABASE_POOL_SIZE ?? "1", 10);
  return Number.isFinite(configured) ? Math.min(5, Math.max(1, configured)) : 1;
}

export const sql =
  globalThis.aviationWikiSql ??
  postgres(connectionString(), {
    // Serverless instances each create their own pool. Keep the default at one
    // connection so small managed Postgres plans are not exhausted by bursts.
    max: poolSize(),
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalThis.aviationWikiSql = sql;

async function createSchema() {
  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(1337, 20260727)`;
    await transaction.unsafe(`
    CREATE TABLE IF NOT EXISTS articles (
      id text PRIMARY KEY,
      slug text NOT NULL,
      title text NOT NULL,
      content_type text NOT NULL CHECK (content_type IN ('airline','alliance','aircraft','airport','manufacturer','engine','event')),
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
      content_type text NOT NULL CHECK (content_type IN ('airline','alliance','aircraft','airport','manufacturer','engine','event')),
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
    ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_content_type_check;
    ALTER TABLE articles ADD CONSTRAINT articles_content_type_check CHECK (content_type IN ('airline','alliance','aircraft','airport','manufacturer','engine','event'));
    ALTER TABLE revisions DROP CONSTRAINT IF EXISTS revisions_content_type_check;
    ALTER TABLE revisions ADD CONSTRAINT revisions_content_type_check CHECK (content_type IN ('airline','alliance','aircraft','airport','manufacturer','engine','event'));
    ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_live_revision_id_fkey;
    ALTER TABLE articles ADD CONSTRAINT articles_live_revision_id_fkey FOREIGN KEY (live_revision_id) REFERENCES revisions(id) DEFERRABLE INITIALLY DEFERRED;
    CREATE INDEX IF NOT EXISTS revisions_article_idx ON revisions(article_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS revisions_status_idx ON revisions(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS revisions_contributor_idx ON revisions(contributor_id, updated_at DESC);
    CREATE TABLE IF NOT EXISTS revision_events (id text PRIMARY KEY, revision_id text NOT NULL REFERENCES revisions(id) ON DELETE CASCADE, actor_id text NOT NULL, from_status text, to_status text NOT NULL, note text, created_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS article_slug_redirects (content_type text NOT NULL, old_slug text NOT NULL, article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL, PRIMARY KEY(content_type,old_slug));
    CREATE TABLE IF NOT EXISTS article_relationships (source_article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE, target_article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE, relationship_type text NOT NULL, approved_revision_id text NOT NULL REFERENCES revisions(id), created_at timestamptz NOT NULL, PRIMARY KEY(source_article_id,relationship_type,target_article_id), CHECK(source_article_id<>target_article_id));
    CREATE INDEX IF NOT EXISTS article_relationships_target_idx ON article_relationships(target_article_id,relationship_type);
    ALTER TABLE article_relationships DROP CONSTRAINT IF EXISTS article_relationships_type_check;
    ALTER TABLE article_relationships ADD CONSTRAINT article_relationships_type_check
      CHECK (relationship_type IN (
        'operates_aircraft',
        'hub_at_airport',
        'manufactured_by',
        'uses_engine',
        'variant_of',
        'produces_aircraft',
        'produces_engine'
      ));
    CREATE OR REPLACE FUNCTION validate_article_relationship_insert()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $relationship_guard$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM articles source
        JOIN articles target
          ON target.id = NEW.target_article_id
        JOIN revisions target_revision
          ON target_revision.id = target.live_revision_id
        JOIN revisions approved_revision
          ON approved_revision.id = NEW.approved_revision_id
        WHERE source.id = NEW.source_article_id
          AND target_revision.status = 'approved'
          AND target.archived_at IS NULL
          AND approved_revision.article_id = source.id
          AND approved_revision.status = 'approved'
          AND (
            (NEW.relationship_type = 'operates_aircraft' AND source.content_type = 'airline' AND target.content_type = 'aircraft')
            OR (NEW.relationship_type = 'hub_at_airport' AND source.content_type = 'airline' AND target.content_type = 'airport')
            OR (NEW.relationship_type = 'manufactured_by' AND source.content_type = 'aircraft' AND target.content_type = 'manufacturer')
            OR (NEW.relationship_type = 'uses_engine' AND source.content_type = 'aircraft' AND target.content_type = 'engine')
            OR (NEW.relationship_type = 'variant_of' AND source.content_type = 'aircraft' AND target.content_type = 'aircraft')
            OR (NEW.relationship_type = 'produces_aircraft' AND source.content_type = 'manufacturer' AND target.content_type = 'aircraft')
            OR (NEW.relationship_type = 'produces_engine' AND source.content_type = 'manufacturer' AND target.content_type = 'engine')
          )
      ) THEN
        RAISE EXCEPTION 'invalid or unverified relationship'
          USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END
    $relationship_guard$;
    DROP TRIGGER IF EXISTS relationships_insert_guard ON article_relationships;
    CREATE TRIGGER relationships_insert_guard
      BEFORE INSERT ON article_relationships
      FOR EACH ROW
      EXECUTE FUNCTION validate_article_relationship_insert();
    CREATE OR REPLACE FUNCTION reject_article_relationship_update()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $relationship_update_guard$
    BEGIN
      RAISE EXCEPTION 'published relationships are immutable; replace them through an approved revision'
        USING ERRCODE = '55000';
    END
    $relationship_update_guard$;
    DROP TRIGGER IF EXISTS relationships_update_guard ON article_relationships;
    CREATE TRIGGER relationships_update_guard
      BEFORE UPDATE ON article_relationships
      FOR EACH ROW
      EXECUTE FUNCTION reject_article_relationship_update();
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
    CREATE TABLE IF NOT EXISTS request_rate_limits (scope text NOT NULL, subject text NOT NULL, window_started_at timestamptz NOT NULL, request_count integer NOT NULL, PRIMARY KEY(scope,subject));
    CREATE TABLE IF NOT EXISTS api_keys (
      id text PRIMARY KEY,
      name text NOT NULL,
      key_hash text NOT NULL UNIQUE,
      key_prefix text NOT NULL,
      user_id text NOT NULL,
      user_name text NOT NULL,
      scopes_json jsonb NOT NULL DEFAULT '["articles:draft"]',
      created_at timestamptz NOT NULL,
      last_used_at timestamptz,
      revoked_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys(user_id, created_at DESC);
    `);
  });
}

export function ensureSchema() {
  globalThis.aviationWikiSchemaReady ??=
    process.env.NODE_ENV === "production" ? Promise.resolve() : createSchema();
  return globalThis.aviationWikiSchemaReady;
}

export async function rows<T extends Record<string, unknown>>(query: string, params: unknown[] = []) {
  await ensureSchema();
  return (await sql.unsafe(query, params as never[])) as unknown as T[];
}

export async function row<T extends Record<string, unknown>>(query: string, params: unknown[] = []) {
  return (await rows<T>(query, params))[0];
}
