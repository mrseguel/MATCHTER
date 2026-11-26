-- Demo only: no money movement, no legal notarial authorization.
ALTER TABLE matchter.project_contract_demos
 ADD COLUMN IF NOT EXISTS notary_demo_paid_at timestamptz,
 ADD COLUMN IF NOT EXISTS notary_demo_fee integer,
 ADD COLUMN IF NOT EXISTS notary_demo_authorized_at timestamptz;
ALTER TABLE matchter.project_contract_demos ADD CONSTRAINT project_contract_demo_payment_order CHECK (
 (notary_demo_paid_at IS NULL AND notary_demo_fee IS NULL AND notary_demo_authorized_at IS NULL)
 OR (mode='notary' AND notary_accepted_at IS NOT NULL AND client_signed_at IS NOT NULL AND provider_signed_at IS NOT NULL AND notary_demo_paid_at IS NOT NULL AND notary_demo_fee IS NOT NULL AND notary_demo_fee=33490 AND (notary_demo_authorized_at IS NULL OR notary_demo_authorized_at>=notary_demo_paid_at))
) NOT VALID;
ALTER TABLE matchter.project_contract_demos VALIDATE CONSTRAINT project_contract_demo_payment_order;
GRANT UPDATE (notary_demo_paid_at,notary_demo_fee,notary_demo_authorized_at) ON matchter.project_contract_demos TO matchter_auth_app;
