ALTER TABLE matchter.project_contract_demos ADD COLUMN IF NOT EXISTS notary_accepted_at timestamptz;
GRANT UPDATE (notary_accepted_at) ON matchter.project_contract_demos TO matchter_auth_app;
