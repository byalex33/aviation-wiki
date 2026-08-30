export const AVIATION_DATA_MIGRATION_ID = "20260830_aviation_data_graph_v1";

/** Additive PostgreSQL migration. Production applies this through the CLI. */
export const AVIATION_DATA_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS aviation_sources (
  id text PRIMARY KEY,
  source_type text NOT NULL CHECK (source_type IN ('manufacturer','operator','regulator','government','database','news','community','other')),
  title text NOT NULL,
  publisher text NOT NULL,
  url text NOT NULL UNIQUE,
  citation text,
  licence text,
  retrieved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS aviation_import_runs (
  id text PRIMARY KEY,
  importer text NOT NULL,
  importer_version text NOT NULL,
  source_id text NOT NULL REFERENCES aviation_sources(id),
  observed_at timestamptz NOT NULL,
  input_fingerprint text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','completed','failed','dry_run')),
  metadata_json jsonb NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  UNIQUE(importer, input_fingerprint)
);

CREATE TABLE IF NOT EXISTS aviation_organizations (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('manufacturer','operator','owner','lessor','authority','other')),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  country_code text CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  article_id text REFERENCES articles(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS aircraft_models (
  id text PRIMARY KEY,
  manufacturer_id text NOT NULL REFERENCES aviation_organizations(id),
  family text NOT NULL,
  variant text NOT NULL,
  designation text NOT NULL,
  icao_type_code text,
  article_id text REFERENCES articles(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE(manufacturer_id, designation)
);

CREATE TABLE IF NOT EXISTS airframes (
  id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS aviation_assertions (
  id text PRIMARY KEY,
  subject_type text NOT NULL CHECK (subject_type IN ('airframe','aircraft_model','organization','registration_assignment','airframe_event','airframe_configuration')),
  subject_id text NOT NULL,
  predicate text NOT NULL,
  value_json jsonb NOT NULL,
  value_fingerprint text NOT NULL,
  effective_from date,
  effective_to date,
  observed_at timestamptz NOT NULL,
  confidence smallint NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  provenance_type text NOT NULL CHECK (provenance_type IN ('importer','manual')),
  importer_name text,
  import_run_id text REFERENCES aviation_import_runs(id),
  source_id text NOT NULL REFERENCES aviation_sources(id),
  review_status text NOT NULL CHECK (review_status IN ('unreviewed','accepted','rejected','superseded','conflicted')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  supersedes_assertion_id text REFERENCES aviation_assertions(id),
  created_at timestamptz NOT NULL,
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  CHECK (provenance_type <> 'importer' OR importer_name IS NOT NULL),
  CHECK (provenance_type <> 'importer' OR import_run_id IS NOT NULL),
  CHECK (review_status <> 'accepted' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS aviation_assertions_idempotency_idx
  ON aviation_assertions(subject_type, subject_id, predicate, value_fingerprint, source_id,
    COALESCE(effective_from, DATE '-infinity'), COALESCE(effective_to, DATE 'infinity'));
CREATE INDEX IF NOT EXISTS aviation_assertions_subject_idx
  ON aviation_assertions(subject_type, subject_id, predicate, review_status);
CREATE INDEX IF NOT EXISTS aviation_assertions_source_idx
  ON aviation_assertions(source_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS aviation_assertion_evidence (
  assertion_id text NOT NULL REFERENCES aviation_assertions(id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES aviation_sources(id),
  evidence_role text NOT NULL CHECK (evidence_role IN ('primary','supporting','contradicting')),
  locator text,
  note text,
  observed_at timestamptz NOT NULL,
  PRIMARY KEY(assertion_id, source_id)
);
CREATE INDEX IF NOT EXISTS aviation_assertion_evidence_source_idx
  ON aviation_assertion_evidence(source_id, assertion_id);

CREATE TABLE IF NOT EXISTS airframe_model_assignments (
  id text PRIMARY KEY,
  airframe_id text NOT NULL REFERENCES airframes(id) ON DELETE CASCADE,
  model_id text NOT NULL REFERENCES aircraft_models(id),
  assertion_id text NOT NULL UNIQUE REFERENCES aviation_assertions(id),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS airframe_identifiers (
  id text PRIMARY KEY,
  airframe_id text NOT NULL REFERENCES airframes(id) ON DELETE CASCADE,
  identifier_type text NOT NULL CHECK (identifier_type IN ('msn','line_number','mode_s','test_registration','other')),
  value text NOT NULL,
  normalized_value text NOT NULL,
  assertion_id text NOT NULL UNIQUE REFERENCES aviation_assertions(id),
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS airframe_identifiers_lookup_idx
  ON airframe_identifiers(identifier_type, normalized_value);

CREATE TABLE IF NOT EXISTS airframe_dates (
  id text PRIMARY KEY,
  airframe_id text NOT NULL REFERENCES airframes(id) ON DELETE CASCADE,
  date_type text NOT NULL CHECK (date_type IN ('build','first_flight','delivery')),
  date_value date NOT NULL,
  precision text NOT NULL CHECK (precision IN ('day','month','year')),
  assertion_id text NOT NULL UNIQUE REFERENCES aviation_assertions(id),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS registration_assignments (
  id text PRIMARY KEY,
  airframe_id text NOT NULL REFERENCES airframes(id) ON DELETE CASCADE,
  registration text NOT NULL,
  normalized_registration text NOT NULL,
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  valid_from date,
  valid_to date,
  operator_id text REFERENCES aviation_organizations(id),
  owner_id text REFERENCES aviation_organizations(id),
  assertion_id text NOT NULL UNIQUE REFERENCES aviation_assertions(id),
  created_at timestamptz NOT NULL,
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS registration_assignments_lookup_idx
  ON registration_assignments(normalized_registration, valid_from DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS registration_assignments_airframe_idx
  ON registration_assignments(airframe_id, valid_from DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS airframe_events (
  id text PRIMARY KEY,
  airframe_id text NOT NULL REFERENCES airframes(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('built','first_flight','delivered','leased','transferred','stored','returned_to_service','converted','retired','scrapped','preserved','incident')),
  occurred_on date,
  ended_on date,
  from_operator_id text REFERENCES aviation_organizations(id),
  to_operator_id text REFERENCES aviation_organizations(id),
  location text,
  status_after text,
  details text,
  assertion_id text NOT NULL UNIQUE REFERENCES aviation_assertions(id),
  created_at timestamptz NOT NULL,
  CHECK (ended_on IS NULL OR occurred_on IS NULL OR ended_on >= occurred_on)
);
CREATE INDEX IF NOT EXISTS airframe_events_timeline_idx
  ON airframe_events(airframe_id, occurred_on, created_at);

CREATE TABLE IF NOT EXISTS airframe_configurations (
  id text PRIMARY KEY,
  airframe_id text NOT NULL REFERENCES airframes(id) ON DELETE CASCADE,
  configuration_type text NOT NULL CHECK (configuration_type IN ('cabin','engine','livery','role','other')),
  configuration_json jsonb NOT NULL,
  valid_from date,
  valid_to date,
  assertion_id text NOT NULL UNIQUE REFERENCES aviation_assertions(id),
  created_at timestamptz NOT NULL,
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS airframe_media (
  id text PRIMARY KEY,
  airframe_id text NOT NULL REFERENCES airframes(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  source_page text NOT NULL,
  creator text NOT NULL,
  licence text NOT NULL,
  licence_url text NOT NULL,
  caption text,
  captured_on date,
  assertion_id text NOT NULL UNIQUE REFERENCES aviation_assertions(id),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS reconciliation_cases (
  id text PRIMARY KEY,
  subject_type text NOT NULL CHECK (subject_type IN ('airframe','aircraft_model','organization','registration_assignment','airframe_event','airframe_configuration')),
  subject_id text NOT NULL,
  predicate text NOT NULL,
  status text NOT NULL CHECK (status IN ('open','resolved','dismissed')),
  canonical_assertion_id text REFERENCES aviation_assertions(id),
  resolution_note text,
  reviewed_by text,
  opened_at timestamptz NOT NULL,
  resolved_at timestamptz,
  CHECK (status <> 'resolved' OR (canonical_assertion_id IS NOT NULL AND reviewed_by IS NOT NULL AND resolved_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS reconciliation_cases_open_idx
  ON reconciliation_cases(subject_type, subject_id, predicate) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS reconciliation_case_assertions (
  case_id text NOT NULL REFERENCES reconciliation_cases(id) ON DELETE CASCADE,
  assertion_id text NOT NULL REFERENCES aviation_assertions(id),
  PRIMARY KEY(case_id, assertion_id)
);

CREATE TABLE IF NOT EXISTS aviation_reconciliation_events (
  id text PRIMARY KEY,
  case_id text NOT NULL REFERENCES reconciliation_cases(id),
  actor_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('resolved','dismissed','reopened')),
  canonical_assertion_id text REFERENCES aviation_assertions(id),
  before_json jsonb NOT NULL,
  after_json jsonb NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS aviation_reconciliation_events_case_idx
  ON aviation_reconciliation_events(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS aviation_data_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL
);
`;
