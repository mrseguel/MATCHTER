-- Simulation only: no financial custody, charges or transfers.
CREATE TABLE IF NOT EXISTS matchter.project_stage_demos (
 request_id uuid NOT NULL,
 agreement_version integer NOT NULL,
 contract_revision integer NOT NULL,
 stage_no integer NOT NULL CHECK(stage_no BETWEEN 1 AND 3),
 amount bigint NOT NULL CHECK(amount>0 AND amount<=100000000000),
 funded_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 released_at timestamptz,
 PRIMARY KEY(request_id,agreement_version,contract_revision,stage_no),
 FOREIGN KEY(request_id,agreement_version,contract_revision) REFERENCES matchter.project_contract_demos(request_id,agreement_version,revision),
 CHECK(delivered_at IS NULL OR delivered_at>=funded_at),
 CHECK(released_at IS NULL OR (delivered_at IS NOT NULL AND released_at>=delivered_at))
);
GRANT SELECT ON matchter.project_stage_demos TO matchter_auth_app;
GRANT INSERT (request_id,agreement_version,contract_revision,stage_no,amount), UPDATE (delivered_at,released_at) ON matchter.project_stage_demos TO matchter_auth_app;
