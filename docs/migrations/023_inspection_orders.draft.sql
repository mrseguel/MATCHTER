-- Draft migration: no real charges or external bookings. Apply on isolated test branch first.
BEGIN;
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
 UNIQUE(claim_id)
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
-- Registry verification/activation by privileged staff only. Never grant registry write to app role.
COMMIT;
