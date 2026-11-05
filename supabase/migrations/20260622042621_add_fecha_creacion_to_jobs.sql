-- Agrega columna de fecha/hora de creación a los trabajos.
-- Se usa para mostrar y filtrar por fecha de creación real del trabajo.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fecha_creacion timestamptz DEFAULT now();

-- Retroalimenta los trabajos existentes con la fecha created_at si ya existe
UPDATE jobs SET fecha_creacion = created_at WHERE fecha_creacion IS NULL;