-- Widen the simulated payment stage constraint; no rows are changed.
BEGIN;
ALTER TABLE matchter.project_stage_demos
 DROP CONSTRAINT project_stage_demos_stage_no_check,
 ADD CONSTRAINT project_stage_demos_stage_no_check CHECK (stage_no BETWEEN 1 AND 50);
COMMIT;
