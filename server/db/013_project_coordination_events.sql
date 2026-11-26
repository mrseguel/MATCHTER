CREATE TABLE IF NOT EXISTS matchter.project_coordination_events (
 message_id uuid NOT NULL REFERENCES matchter.swipe_messages(id),
 revision integer NOT NULL CHECK(revision>0),
 actor_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 action text NOT NULL CHECK(action IN ('quote','propose','accept','report')),
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(message_id,revision)
);
GRANT SELECT,INSERT (message_id,revision,actor_profile_id,action,state) ON matchter.project_coordination_events TO matchter_auth_app;
