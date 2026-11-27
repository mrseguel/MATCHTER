-- Private beta attachments. Not applied; validate permissions and storage before activation.
BEGIN;
CREATE TABLE IF NOT EXISTS matchter.inspection_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES matchter.inspection_orders(id),
 uploader_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 submission_id uuid NOT NULL,
 filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 180),
 media_type text NOT NULL CHECK(media_type IN ('application/pdf','image/jpeg','image/png')),
 bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 512000),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,submission_id)
);
CREATE INDEX IF NOT EXISTS inspection_attachments_order_idx ON matchter.inspection_attachments(order_id,created_at);
GRANT SELECT ON matchter.inspection_attachments TO matchter_auth_app;
GRANT INSERT(order_id,uploader_profile_id,submission_id,filename,media_type,bytes,sha256) ON matchter.inspection_attachments TO matchter_auth_app;
COMMIT;
