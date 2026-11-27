-- Isolated QA only. Store authenticated event hints, never original bodies or secrets.
BEGIN;
CREATE TABLE matchter.sandbox_notification_inbox (
 event_key text PRIMARY KEY CHECK(event_key ~ '^[a-f0-9]{64}$'),
 provider text NOT NULL CHECK(provider IN ('khipu','mercadopago')),
 merchant_id text NOT NULL CHECK(merchant_id ~ '^[0-9]{1,20}$'),
 resource_id text NOT NULL CHECK((provider='khipu' AND resource_id ~ '^[a-zA-Z0-9]{12}$') OR (provider='mercadopago' AND resource_id ~ '^[0-9]{1,20}$')),
 received_at timestamptz NOT NULL DEFAULT now(),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','processed','review')),
 tries integer NOT NULL DEFAULT 0 CHECK(tries BETWEEN 0 AND 5),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_id uuid,
 lease_until timestamptz,
 CHECK((state='processing' AND lease_id IS NOT NULL AND lease_until IS NOT NULL) OR (state<>'processing' AND lease_id IS NULL AND lease_until IS NULL))
);
CREATE INDEX sandbox_notification_due ON matchter.sandbox_notification_inbox(next_attempt_at,received_at) WHERE state IN ('pending','processing');
GRANT SELECT ON matchter.sandbox_notification_inbox TO matchter_auth_app;
GRANT INSERT(event_key,provider,merchant_id,resource_id), UPDATE(state,tries,next_attempt_at,lease_id,lease_until) ON matchter.sandbox_notification_inbox TO matchter_auth_app;
COMMIT;
