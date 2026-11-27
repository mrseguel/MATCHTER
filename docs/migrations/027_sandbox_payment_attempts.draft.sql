-- QA only. No live environment, no bank/card information and no financial settlement.
BEGIN;
CREATE TABLE matchter.sandbox_payment_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES matchter.swipe_requests(id),
 agreement_version integer NOT NULL CHECK(agreement_version>0),
 contract_revision integer NOT NULL CHECK(contract_revision>0),
 contract_digest text NOT NULL CHECK(contract_digest ~ '^[a-f0-9]{64}$'),
 owner_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 submission_id uuid NOT NULL,
 provider text NOT NULL CHECK(provider IN ('khipu','mercadopago')),
 amount_clp integer NOT NULL CHECK(amount_clp>0),
 currency text NOT NULL DEFAULT 'CLP' CHECK(currency='CLP'),
 environment text NOT NULL DEFAULT 'sandbox' CHECK(environment='sandbox'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_profile_id,submission_id),
 FOREIGN KEY(request_id,agreement_version,contract_revision) REFERENCES matchter.project_contract_demos(request_id,agreement_version,revision)
);
-- One permanent reservation per party and contract request, independent of provider or revision.
-- A release is permitted ONLY before external creation is attempted; history is never deleted.
CREATE TABLE matchter.sandbox_payment_slots (
 request_id uuid NOT NULL REFERENCES matchter.swipe_requests(id),
 owner_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 attempt_id uuid NOT NULL UNIQUE REFERENCES matchter.sandbox_payment_attempts(id),
 PRIMARY KEY(request_id,owner_profile_id)
);
CREATE TABLE matchter.sandbox_payment_attempt_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES matchter.sandbox_payment_attempts(id),
 sequence integer NOT NULL CHECK(sequence BETWEEN 1 AND 5),
 state text NOT NULL CHECK(state IN ('reserved','cancelled_unsent','creation_unknown','checkout_created','verified_test','review')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(attempt_id,sequence)
);
GRANT SELECT ON matchter.sandbox_payment_attempts,matchter.sandbox_payment_slots,matchter.sandbox_payment_attempt_events TO matchter_auth_app;
GRANT INSERT(request_id,agreement_version,contract_revision,contract_digest,owner_profile_id,submission_id,provider,amount_clp) ON matchter.sandbox_payment_attempts TO matchter_auth_app;
GRANT INSERT(request_id,owner_profile_id,attempt_id),UPDATE(attempt_id) ON matchter.sandbox_payment_slots TO matchter_auth_app;
GRANT INSERT(attempt_id,sequence,state) ON matchter.sandbox_payment_attempt_events TO matchter_auth_app;
COMMIT;
