-- Only the integration database, never the production branch.
CREATE TABLE IF NOT EXISTS matchter.project_agreement_versions (
 request_id uuid NOT NULL REFERENCES matchter.swipe_requests(id),
 version integer NOT NULL CHECK (version > 0),
 proposed_by uuid NOT NULL REFERENCES matchter.account_profiles(id),
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 client_confirmed_at timestamptz,
 provider_confirmed_at timestamptz,
 PRIMARY KEY(request_id,version),
 CHECK (client_confirmed_at IS NOT NULL OR provider_confirmed_at IS NOT NULL)
);
GRANT SELECT ON matchter.project_agreement_versions TO matchter_auth_app;
GRANT INSERT (request_id,version,proposed_by,data,client_confirmed_at,provider_confirmed_at), UPDATE (client_confirmed_at,provider_confirmed_at) ON matchter.project_agreement_versions TO matchter_auth_app;
