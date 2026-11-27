-- Draft additive migration: not executed in Neon. No changes to historical payment rows.
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
-- Access grants and actor permissions must be verified in a test database before rollout.
COMMIT;
