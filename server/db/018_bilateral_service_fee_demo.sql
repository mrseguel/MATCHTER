-- Append new columns without changing existing signed contracts or deposits.
ALTER TABLE matchter.project_contract_demos ADD COLUMN IF NOT EXISTS provider_fee_demo_mode text;
ALTER TABLE matchter.project_contract_demos ADD COLUMN IF NOT EXISTS provider_fee_demo_paid_at timestamptz;
ALTER TABLE matchter.project_contract_demos ADD COLUMN IF NOT EXISTS provider_fee_demo_stage_no integer;
ALTER TABLE matchter.project_contract_demos ADD CONSTRAINT bilateral_service_fee_demo_check CHECK (
 (provider_fee_demo_mode IS NULL AND provider_fee_demo_paid_at IS NULL AND provider_fee_demo_stage_no IS NULL)
 OR (COALESCE(terms->'serviceFee'->>'version','')='2' AND client_signed_at IS NOT NULL AND provider_signed_at IS NOT NULL AND (
 (provider_fee_demo_mode='upfront' AND provider_fee_demo_paid_at IS NOT NULL AND provider_fee_demo_stage_no IS NULL)
 OR (provider_fee_demo_mode='deferred' AND ((provider_fee_demo_paid_at IS NULL AND provider_fee_demo_stage_no IS NULL) OR (provider_fee_demo_paid_at IS NOT NULL AND provider_fee_demo_stage_no BETWEEN 1 AND 50)))
 ) AND provider_fee_demo_mode IS NOT NULL)
);
GRANT UPDATE (provider_fee_demo_mode,provider_fee_demo_paid_at,provider_fee_demo_stage_no) ON matchter.project_contract_demos TO matchter_auth_app;
