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
-- The authenticated application service checks participant, role, contract and sequence under lock.
GRANT SELECT ON matchter.project_direct_stage_events TO matchter_auth_app;
GRANT INSERT (request_id,agreement_version,contract_revision,stage_no,action,actor_profile_id,progress_percent) ON matchter.project_direct_stage_events TO matchter_auth_app;
GRANT USAGE ON SEQUENCE matchter.project_direct_stage_events_event_id_seq TO matchter_auth_app;
-- Validate role privileges in a test database before rollout. No UPDATE or DELETE grants.
COMMIT;
