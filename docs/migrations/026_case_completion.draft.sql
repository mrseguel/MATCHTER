-- Additive QA extension; run once after 019-025. No real payments.
BEGIN;
CREATE TABLE matchter.claim_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 claim_id uuid NOT NULL REFERENCES matchter.stage_claims(id),
 uploader_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 submission_id uuid NOT NULL,
 filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 180),
 media_type text NOT NULL CHECK(media_type IN ('application/pdf','image/jpeg','image/png','video/mp4')),
 bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 512000),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(claim_id,uploader_profile_id,submission_id)
);
CREATE INDEX claim_attachments_case_idx ON matchter.claim_attachments(claim_id,created_at);
GRANT SELECT ON matchter.claim_attachments TO matchter_auth_app;
GRANT INSERT(claim_id,uploader_profile_id,submission_id,filename,media_type,bytes,sha256) ON matchter.claim_attachments TO matchter_auth_app;
ALTER TABLE matchter.inspection_awards ADD COLUMN cancelled_at timestamptz;
ALTER TABLE matchter.inspection_awards ADD COLUMN cancelled_by uuid REFERENCES matchter.account_profiles(id);
ALTER TABLE matchter.inspection_awards ADD COLUMN cancellation_reason text CHECK(length(cancellation_reason) BETWEEN 5 AND 1000);
ALTER TABLE matchter.inspection_awards ADD CONSTRAINT inspection_cancellation_complete CHECK((cancelled_at IS NULL AND cancelled_by IS NULL AND cancellation_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL));
ALTER TABLE matchter.inspection_awards DROP CONSTRAINT inspection_awards_pkey;
ALTER TABLE matchter.inspection_awards ADD PRIMARY KEY(order_id);
CREATE UNIQUE INDEX inspection_one_active_award ON matchter.inspection_awards(claim_id) WHERE cancelled_at IS NULL;
GRANT UPDATE(cancelled_at,cancelled_by,cancellation_reason) ON matchter.inspection_awards TO matchter_auth_app;
CREATE TABLE matchter.inspector_administrators(account_id uuid PRIMARY KEY REFERENCES matchter.accounts(id));
GRANT SELECT(account_id) ON matchter.inspector_administrators TO matchter_auth_app;
CREATE TABLE matchter.inspector_registry_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 profile_id uuid NOT NULL REFERENCES matchter.inspector_registry(profile_id),
 actor_account_id uuid NOT NULL REFERENCES matchter.accounts(id),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON matchter.inspector_registry_events TO matchter_auth_app;
GRANT INSERT(profile_id,actor_account_id,data) ON matchter.inspector_registry_events TO matchter_auth_app;
GRANT INSERT(profile_id,display_name,specialty,service_area,enabled,verified_at), UPDATE(display_name,specialty,service_area,enabled,verified_at) ON matchter.inspector_registry TO matchter_auth_app;
CREATE TABLE matchter.case_notice_reads (
 profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 notice_id text NOT NULL CHECK(length(notice_id) BETWEEN 1 AND 100),
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(profile_id,notice_id)
);
GRANT SELECT ON matchter.case_notice_reads TO matchter_auth_app;
GRANT INSERT(profile_id,notice_id) ON matchter.case_notice_reads TO matchter_auth_app;
COMMIT;
