-- Original evaluations stay immutable; edits are separate revisions.
CREATE TABLE IF NOT EXISTS matchter.project_review_demo_revisions (
 request_id uuid NOT NULL,
 agreement_version integer NOT NULL,
 contract_revision integer NOT NULL,
 revision integer NOT NULL CHECK (revision >= 2),
 score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
 comment text NOT NULL DEFAULT '' CHECK (char_length(comment)<=1500),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(request_id,agreement_version,contract_revision,revision),
 FOREIGN KEY(request_id,agreement_version,contract_revision)
 REFERENCES matchter.project_review_demos(request_id,agreement_version,contract_revision)
);
GRANT SELECT ON matchter.project_review_demo_revisions TO matchter_auth_app;
GRANT INSERT (request_id,agreement_version,contract_revision,revision,score,comment) ON matchter.project_review_demo_revisions TO matchter_auth_app;
