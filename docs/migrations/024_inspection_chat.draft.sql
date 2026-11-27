-- Draft: compare quotes in separate private conversations before choosing one.
BEGIN;
ALTER TABLE matchter.inspection_orders DROP CONSTRAINT IF EXISTS inspection_orders_claim_id_key;
ALTER TABLE matchter.inspection_orders ADD CONSTRAINT inspection_conversation_unique UNIQUE(claim_id,requester_profile_id,inspector_profile_id);
-- One accepted inspection per case, independent of how many conversations exist.
CREATE TABLE IF NOT EXISTS matchter.inspection_awards (
 claim_id uuid PRIMARY KEY REFERENCES matchter.stage_claims(id),
 order_id uuid NOT NULL UNIQUE REFERENCES matchter.inspection_orders(id),
 accepted_at timestamptz NOT NULL DEFAULT now()
);
-- Preserve existing accepted trial orders if migration 023 was already applied.
INSERT INTO matchter.inspection_awards(claim_id,order_id)
 SELECT o.claim_id,o.id FROM matchter.inspection_orders o
 WHERE EXISTS (SELECT 1 FROM matchter.inspection_order_events e WHERE e.order_id=o.id AND e.data->>'action'='accept')
 ON CONFLICT DO NOTHING;
GRANT SELECT ON matchter.inspection_awards TO matchter_auth_app;
GRANT INSERT(claim_id,order_id) ON matchter.inspection_awards TO matchter_auth_app;
COMMIT;
