CREATE TABLE IF NOT EXISTS matchter.account_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES matchter.accounts(id),
 role text NOT NULL CHECK (role IN ('Cliente','Maestro o contratista','Profesional','Empresa')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (account_id, role)
);
CREATE TABLE IF NOT EXISTS matchter.account_active_profiles (
 account_id uuid PRIMARY KEY REFERENCES matchter.accounts(id),
 role text NOT NULL,
 FOREIGN KEY(account_id,role) REFERENCES matchter.account_profiles(account_id,role)
);
INSERT INTO matchter.account_profiles(account_id,role) SELECT id,role FROM matchter.accounts ON CONFLICT(account_id,role) DO NOTHING;
INSERT INTO matchter.account_active_profiles(account_id,role) SELECT id,role FROM matchter.accounts ON CONFLICT(account_id) DO NOTHING;
GRANT SELECT (id,account_id,role), INSERT (account_id,role) ON matchter.account_profiles TO matchter_auth_app;
GRANT SELECT (account_id,role), INSERT (account_id,role), UPDATE(role) ON matchter.account_active_profiles TO matchter_auth_app;
