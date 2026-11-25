-- Proposed schema for an isolated beta database. Not applied.
CREATE TABLE IF NOT EXISTS accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE CHECK (email=lower(email)),
 display_name text NOT NULL,
 role text NOT NULL CHECK (role IN ('client','tradesperson','professional','company')),
 password_hash text,
 email_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS account_private_details (
 account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 first_name text, last_name text, company_name text,
 legal_representative text, company_rut text, representative_rut text,
 phone text, city text, sector text, address text
);
CREATE TABLE IF NOT EXISTS account_identities (
 provider text NOT NULL CHECK (provider IN ('google','apple')),
 provider_subject text NOT NULL,
 account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 PRIMARY KEY(provider,provider_subject)
);
CREATE TABLE IF NOT EXISTS account_sessions (
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- Do not expose private details via public profile APIs.
-- Implement server-side hashing, verified email, secure sessions, OAuth/OIDC
-- callback validation (state, nonce, PKCE where applicable), explicit secure account linking,
-- role authorization, rate limits, legal verification and recovery before real use.
