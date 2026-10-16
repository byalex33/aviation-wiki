import { contentTypeSqlList } from "@/lib/wiki-types";

export const AIRFRAME_MIGRATION_ID = "20261016_airframe_articles";
const relationshipTypes =
  "'operates_aircraft','hub_at_airport','manufactured_by','uses_engine','variant_of','produces_aircraft','produces_engine','instance_of','operated_by'";

/**
 * Additive production migration. It widens the article content-type check,
 * allows airframe relationships, and creates the airframe read-model index.
 * It does not rewrite article rows. Run `scripts/migrate-airframes.ts` to
 * move existing single-registration aircraft articles afterwards.
 */
export const AIRFRAME_SCHEMA_SQL = `
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_content_type_check;
ALTER TABLE articles ADD CONSTRAINT articles_content_type_check CHECK (content_type IN (${contentTypeSqlList}));
ALTER TABLE revisions DROP CONSTRAINT IF EXISTS revisions_content_type_check;
ALTER TABLE revisions ADD CONSTRAINT revisions_content_type_check CHECK (content_type IN (${contentTypeSqlList}));
ALTER TABLE article_relationships DROP CONSTRAINT IF EXISTS article_relationships_type_check;
ALTER TABLE article_relationships ADD CONSTRAINT article_relationships_type_check
  CHECK (relationship_type IN (${relationshipTypes}));
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
        OR (NEW.relationship_type = 'manufactured_by' AND source.content_type IN ('aircraft','airframe') AND target.content_type = 'manufacturer')
        OR (NEW.relationship_type = 'uses_engine' AND source.content_type = 'aircraft' AND target.content_type = 'engine')
        OR (NEW.relationship_type = 'variant_of' AND source.content_type = 'aircraft' AND target.content_type = 'aircraft')
        OR (NEW.relationship_type = 'produces_aircraft' AND source.content_type = 'manufacturer' AND target.content_type = 'aircraft')
        OR (NEW.relationship_type = 'produces_engine' AND source.content_type = 'manufacturer' AND target.content_type = 'engine')
        OR (NEW.relationship_type = 'instance_of' AND source.content_type = 'airframe' AND target.content_type = 'aircraft')
        OR (NEW.relationship_type = 'operated_by' AND source.content_type = 'airframe' AND target.content_type = 'airline')
      )
  ) THEN
    RAISE EXCEPTION 'invalid or unverified relationship'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$relationship_guard$;
CREATE TABLE IF NOT EXISTS airframe_index (
  article_id text PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  registration text NOT NULL,
  registration_slug text NOT NULL,
  msn text,
  msn_slug text,
  aircraft_type text NOT NULL,
  variant text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('active','stored','scrapped','on_order')),
  delivery_on date,
  manufacture_year integer,
  fate text,
  current_operator_name text,
  current_operator_slug text,
  type_slug text,
  operator_history jsonb NOT NULL DEFAULT '[]',
  registration_history jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS airframe_index_registration_slug_idx ON airframe_index (registration_slug);
CREATE INDEX IF NOT EXISTS airframe_index_operator_idx ON airframe_index (current_operator_slug);
CREATE INDEX IF NOT EXISTS airframe_index_type_idx ON airframe_index (type_slug);
CREATE INDEX IF NOT EXISTS airframe_index_msn_idx ON airframe_index (msn_slug);
`;
