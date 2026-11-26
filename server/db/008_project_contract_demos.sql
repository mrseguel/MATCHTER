CREATE TABLE IF NOT EXISTS matchter.project_contract_demos (
 request_id uuid NOT NULL,
 agreement_version integer NOT NULL,
 revision integer NOT NULL CHECK(revision>0),
 mode text NOT NULL CHECK(mode IN ('simple','notary','none')),
 terms jsonb NOT NULL CHECK(jsonb_typeof(terms)='object'),
 digest text NOT NULL CHECK(length(digest)=64),
 created_at timestamptz NOT NULL DEFAULT now(),
 client_signed_at timestamptz,
 provider_signed_at timestamptz,
 PRIMARY KEY(request_id,agreement_version,revision),
 FOREIGN KEY(request_id,agreement_version) REFERENCES matchter.project_agreement_versions(request_id,version)
);
GRANT SELECT ON matchter.project_contract_demos TO matchter_auth_app;
GRANT INSERT (request_id,agreement_version,revision,mode,terms,digest), UPDATE (client_signed_at,provider_signed_at) ON matchter.project_contract_demos TO matchter_auth_app;
