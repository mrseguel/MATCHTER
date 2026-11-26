-- One immutable simulated customer review per completed contract.
CREATE TABLE IF NOT EXISTS matchter.project_review_demos (
 request_id uuid NOT NULL,
 agreement_version integer NOT NULL,
 contract_revision integer NOT NULL,
 score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
 comment text NOT NULL DEFAULT '' CHECK (char_length(comment)<=1500),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(request_id,agreement_version,contract_revision),
 FOREIGN KEY(request_id,agreement_version,contract_revision)
 REFERENCES matchter.project_contract_demos(request_id,agreement_version,revision)
);
GRANT SELECT ON matchter.project_review_demos TO matchter_auth_app;
GRANT INSERT (request_id,agreement_version,contract_revision,score,comment) ON matchter.project_review_demos TO matchter_auth_app;
