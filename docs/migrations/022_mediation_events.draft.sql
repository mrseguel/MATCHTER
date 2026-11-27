-- Additive draft only. No changes to payment tables.
BEGIN;
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
COMMIT;
