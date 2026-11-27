-- Consolidated additive migration for fresh QA branches ONLY; do not run if tables 019-025 already exist.
BEGIN;
CREATE TABLE IF NOT EXISTS matchter.project_direct_stage_events (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL,
 agreement_version integer NOT NULL,
 contract_revision integer NOT NULL,
 stage_no integer NOT NULL CHECK(stage_no BETWEEN 1 AND 50),
 action text NOT NULL CHECK(action IN ('start','progress','deliver','accept')),
 actor_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 progress_percent numeric(5,2),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(request_id,agreement_version,contract_revision) REFERENCES matchter.project_contract_demos(request_id,agreement_version,revision),
 CHECK ((action='progress' AND progress_percent IS NOT NULL AND progress_percent BETWEEN 0 AND 100)
 OR (action<>'progress' AND progress_percent IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS direct_stage_once ON matchter.project_direct_stage_events
 (request_id,agreement_version,contract_revision,stage_no,action) WHERE action<>'progress';
CREATE INDEX IF NOT EXISTS direct_stage_history ON matchter.project_direct_stage_events
 (request_id,agreement_version,contract_revision,stage_no,event_id);

GRANT SELECT ON matchter.project_direct_stage_events TO matchter_auth_app;
GRANT INSERT (request_id,agreement_version,contract_revision,stage_no,action,actor_profile_id,progress_percent) ON matchter.project_direct_stage_events TO matchter_auth_app;
GRANT USAGE ON SEQUENCE matchter.project_direct_stage_events_event_id_seq TO matchter_auth_app;

CREATE TABLE IF NOT EXISTS matchter.payment_administrators (
 account_id uuid PRIMARY KEY REFERENCES matchter.accounts(id),
 granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS matchter.payment_availability_events (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_account_id uuid NOT NULL REFERENCES matchter.payment_administrators(account_id),
 availability text NOT NULL CHECK(availability IN ('direct-only','both','protected-only')),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (account_id) ON matchter.payment_administrators TO matchter_auth_app;
GRANT SELECT ON matchter.payment_availability_events TO matchter_auth_app;
GRANT INSERT (actor_account_id,availability) ON matchter.payment_availability_events TO matchter_auth_app;
GRANT USAGE ON SEQUENCE matchter.payment_availability_events_event_id_seq TO matchter_auth_app;

CREATE TABLE IF NOT EXISTS matchter.stage_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL,
 agreement_version integer NOT NULL,
 contract_revision integer NOT NULL,
 reporter_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 submission_id uuid NOT NULL,
 stage_no integer NOT NULL CHECK(stage_no BETWEEN 1 AND 50),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(request_id,agreement_version,contract_revision) REFERENCES matchter.project_contract_demos(request_id,agreement_version,revision),
 UNIQUE(reporter_profile_id,submission_id)
);
CREATE INDEX IF NOT EXISTS stage_claim_request_idx ON matchter.stage_claims(request_id,created_at DESC);
GRANT SELECT ON matchter.stage_claims TO matchter_auth_app;
GRANT INSERT (request_id,agreement_version,contract_revision,reporter_profile_id,submission_id,stage_no,data) ON matchter.stage_claims TO matchter_auth_app;

CREATE TABLE IF NOT EXISTS matchter.mediation_administrators (
 account_id uuid PRIMARY KEY REFERENCES matchter.accounts(id),
 granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS matchter.stage_claim_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 seq bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 claim_id uuid NOT NULL REFERENCES matchter.stage_claims(id),
 actor_account_id uuid NOT NULL REFERENCES matchter.accounts(id),
 actor_profile_id uuid REFERENCES matchter.account_profiles(id),
 submission_id uuid NOT NULL,
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(claim_id,actor_account_id,submission_id)
);
CREATE INDEX IF NOT EXISTS claim_events_history ON matchter.stage_claim_events(claim_id,seq);
GRANT SELECT (account_id) ON matchter.mediation_administrators TO matchter_auth_app;
GRANT SELECT ON matchter.stage_claim_events TO matchter_auth_app;
GRANT INSERT (claim_id,actor_account_id,actor_profile_id,submission_id,data) ON matchter.stage_claim_events TO matchter_auth_app;
GRANT USAGE ON SEQUENCE matchter.stage_claim_events_seq_seq TO matchter_auth_app;

CREATE TABLE IF NOT EXISTS matchter.inspector_registry (
 profile_id uuid PRIMARY KEY REFERENCES matchter.account_profiles(id),
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 120),
 specialty text NOT NULL CHECK(length(specialty) BETWEEN 1 AND 160),
 service_area text NOT NULL CHECK(length(service_area) BETWEEN 1 AND 160),
 enabled boolean NOT NULL DEFAULT false,
 verified_at timestamptz
);
CREATE TABLE IF NOT EXISTS matchter.inspection_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 claim_id uuid NOT NULL REFERENCES matchter.stage_claims(id),
 requester_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 inspector_profile_id uuid NOT NULL REFERENCES matchter.inspector_registry(profile_id),
 scope text NOT NULL CHECK(length(scope) BETWEEN 20 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT inspection_conversation_unique UNIQUE(claim_id,requester_profile_id,inspector_profile_id),
 CONSTRAINT inspection_case_order_unique UNIQUE(claim_id,id)
);
CREATE TABLE IF NOT EXISTS matchter.inspection_order_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 seq bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 order_id uuid NOT NULL REFERENCES matchter.inspection_orders(id),
 actor_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 submission_id uuid NOT NULL,
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,actor_profile_id,submission_id)
);
CREATE INDEX IF NOT EXISTS inspection_history_idx ON matchter.inspection_order_events(order_id,seq);
CREATE INDEX IF NOT EXISTS inspection_inspector_idx ON matchter.inspection_orders(inspector_profile_id,created_at DESC);
GRANT SELECT ON matchter.inspector_registry,matchter.inspection_orders,matchter.inspection_order_events TO matchter_auth_app;
GRANT INSERT (claim_id,requester_profile_id,inspector_profile_id,scope) ON matchter.inspection_orders TO matchter_auth_app;
GRANT INSERT (order_id,actor_profile_id,submission_id,data) ON matchter.inspection_order_events TO matchter_auth_app;
GRANT USAGE ON SEQUENCE matchter.inspection_order_events_seq_seq TO matchter_auth_app;




CREATE TABLE IF NOT EXISTS matchter.inspection_awards (
 claim_id uuid PRIMARY KEY REFERENCES matchter.stage_claims(id),
 order_id uuid NOT NULL UNIQUE REFERENCES matchter.inspection_orders(id),
 accepted_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(claim_id,order_id) REFERENCES matchter.inspection_orders(claim_id,id)
);


GRANT SELECT ON matchter.inspection_awards TO matchter_auth_app;
GRANT INSERT(claim_id,order_id) ON matchter.inspection_awards TO matchter_auth_app;

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
