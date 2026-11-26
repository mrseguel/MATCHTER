-- Additive test-only receipt. Signed historical contracts remain exempt.
ALTER TABLE matchter.project_contract_demos ADD COLUMN IF NOT EXISTS service_fee_demo_paid_at timestamptz;
ALTER TABLE matchter.project_contract_demos ADD CONSTRAINT contract_demo_service_fee_paid_check CHECK (service_fee_demo_paid_at IS NULL OR (terms ? 'serviceFee' AND client_signed_at IS NOT NULL AND provider_signed_at IS NOT NULL AND service_fee_demo_paid_at>=client_signed_at AND service_fee_demo_paid_at>=provider_signed_at));
GRANT UPDATE (service_fee_demo_paid_at) ON matchter.project_contract_demos TO matchter_auth_app;
