-- Additive draft, not executed. Keep allegations separate from project/payment state.
BEGIN;
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
-- No update/delete, no payment operations. Access checks in authenticated service.
COMMIT;
