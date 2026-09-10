export const NOTIFICATION_DIGEST_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS notification_immediate_deliveries (
    notification_id text PRIMARY KEY REFERENCES notifications(id)
  );
  CREATE TABLE IF NOT EXISTS notification_digest_batches (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    payload_json jsonb NOT NULL,
    notification_ids_json jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'held')),
    lease_token text,
    lease_until timestamptz,
    first_attempt_at timestamptz,
    provider_message_id text,
    failure_reason text,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
  );
  CREATE INDEX IF NOT EXISTS notification_digest_pending_idx
    ON notification_digest_batches(status, lease_until);
  CREATE TABLE IF NOT EXISTS notification_digest_items (
    notification_id text PRIMARY KEY REFERENCES notifications(id),
    batch_id text NOT NULL REFERENCES notification_digest_batches(id)
  );
  CREATE INDEX IF NOT EXISTS notification_digest_items_batch_idx
    ON notification_digest_items(batch_id);
`;
