-- Apply only to branch matchter-integracion, not production.
CREATE SCHEMA IF NOT EXISTS matchter_connectivity;
CREATE TABLE IF NOT EXISTS matchter_connectivity.probe (
  probe_key text PRIMARY KEY CHECK (probe_key = 'vercel-integration'),
  checked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Create matchter_probe separately with a password managed by Neon.
-- Grant only USAGE on this schema and SELECT, INSERT, UPDATE on its probe table.
-- No grants on matchter.accounts, matchter.requests, or matchter.matches.
