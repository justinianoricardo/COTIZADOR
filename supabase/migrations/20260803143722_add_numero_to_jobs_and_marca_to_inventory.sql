-- =========================================================
-- 1) jobs.numero: sequential, never reused even after deletes
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS jobs_numero_seq START 1;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS numero int;

-- Assign sequential numbers to existing rows (ordered by creation date)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS n FROM jobs
)
UPDATE jobs SET numero = numbered.n
FROM numbered
WHERE jobs.id = numbered.id AND jobs.numero IS NULL;

-- Set default to nextval and make NOT NULL
ALTER TABLE jobs ALTER COLUMN numero SET DEFAULT nextval('jobs_numero_seq');
ALTER TABLE jobs ALTER COLUMN numero SET NOT NULL;

-- Advance the sequence past the highest existing numero
SELECT setval('jobs_numero_seq', COALESCE((SELECT MAX(numero) FROM jobs), 0));

-- =========================================================
-- 2) inventory.marca: brand name for filament rolls
-- =========================================================
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS marca text DEFAULT '';

-- =========================================================
-- 3) Drop jobs updated_at trigger so ordering is managed client-side.
--    The store upserts ALL rows on every save; a trigger would bump
--    updated_at for every row, making order-by-updated_at meaningless.
-- =========================================================
DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;