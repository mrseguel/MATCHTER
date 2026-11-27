-- Additive migration; apply only after validation on isolated test branch.
BEGIN;
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
-- Administrator enrollment is a separate privileged operation, never a user profile switch.
COMMIT;
