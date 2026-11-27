-- Sandbox-only append-only external identifiers and reconciliation observations.
BEGIN;
CREATE TABLE matchter.sandbox_checkout_bindings (
 attempt_id uuid PRIMARY KEY REFERENCES matchter.sandbox_payment_attempts(id),
 provider text NOT NULL CHECK(provider IN ('khipu','mercadopago')),
 merchant_id text NOT NULL CHECK(merchant_id ~ '^[0-9]{1,20}$'),
 checkout_id text NOT NULL CHECK(checkout_id ~ '^[A-Za-z0-9_-]{1,64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,merchant_id,checkout_id)
);
CREATE TABLE matchter.sandbox_payment_bindings (
 attempt_id uuid PRIMARY KEY REFERENCES matchter.sandbox_checkout_bindings(attempt_id),
 provider text NOT NULL CHECK(provider IN ('khipu','mercadopago')),
 merchant_id text NOT NULL CHECK(merchant_id ~ '^[0-9]{1,20}$'),
 payment_id text NOT NULL CHECK(payment_id ~ '^[A-Za-z0-9_-]{1,64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,merchant_id,payment_id)
);
CREATE TABLE matchter.sandbox_payment_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES matchter.sandbox_payment_bindings(attempt_id),
 sequence integer NOT NULL CHECK(sequence>0),
 status text NOT NULL CHECK(status IN ('pending','declined','verified_test','review')),
 observed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(attempt_id,sequence)
);
GRANT SELECT ON matchter.sandbox_checkout_bindings,matchter.sandbox_payment_bindings,matchter.sandbox_payment_observations TO matchter_auth_app;
GRANT INSERT(attempt_id,provider,merchant_id,checkout_id) ON matchter.sandbox_checkout_bindings TO matchter_auth_app;
GRANT INSERT(attempt_id,provider,merchant_id,payment_id) ON matchter.sandbox_payment_bindings TO matchter_auth_app;
GRANT INSERT(attempt_id,sequence,status) ON matchter.sandbox_payment_observations TO matchter_auth_app;
COMMIT;
