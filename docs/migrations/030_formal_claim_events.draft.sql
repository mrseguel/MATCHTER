-- Additive. Separate formal claim events from the legacy human mediation stream.
CREATE TABLE IF NOT EXISTS matchter.formal_claim_events (
 seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 claim_id uuid NOT NULL REFERENCES matchter.stage_claims(id),
 actor_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 submission_id uuid NOT NULL,
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(claim_id,actor_profile_id,submission_id)
);
CREATE INDEX IF NOT EXISTS formal_claim_events_case_idx ON matchter.formal_claim_events(claim_id,seq);
-- Role grants are environment-specific. QA only: SELECT and INSERT, never UPDATE or DELETE.
