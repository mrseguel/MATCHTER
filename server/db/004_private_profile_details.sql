CREATE TABLE IF NOT EXISTS matchter.profile_details (
 profile_id uuid PRIMARY KEY REFERENCES matchter.account_profiles(id),
 city text NOT NULL DEFAULT '' CHECK (char_length(city)<=100),
 specialty text NOT NULL DEFAULT '' CHECK (char_length(specialty)<=120),
 bio text NOT NULL DEFAULT '' CHECK (char_length(bio)<=600),
 work_mode text NOT NULL DEFAULT '' CHECK (work_mode IN ('','Independiente','Con equipo','Contratista')),
 business_name text NOT NULL DEFAULT '' CHECK (char_length(business_name)<=150),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (profile_id,city,specialty,bio,work_mode,business_name,updated_at), INSERT (profile_id,city,specialty,bio,work_mode,business_name), UPDATE (city,specialty,bio,work_mode,business_name,updated_at) ON matchter.profile_details TO matchter_auth_app;
