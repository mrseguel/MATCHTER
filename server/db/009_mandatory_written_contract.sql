-- Preserve existing history. Disallow unsigned modes at the database boundary.
ALTER TABLE matchter.project_contract_demos ADD CONSTRAINT project_contract_demos_written_only CHECK (mode IN ('simple','notary')) NOT VALID;
ALTER TABLE matchter.project_contract_demos VALIDATE CONSTRAINT project_contract_demos_written_only;
