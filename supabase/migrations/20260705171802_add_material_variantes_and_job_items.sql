-- Add variantes column to materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS variantes jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add items column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update existing materials with default variantes
UPDATE materials SET variantes = '["Estándar"]'::jsonb WHERE variantes = '[]'::jsonb OR variantes IS NULL;

-- Update specific materials with their default variantes
UPDATE materials SET variantes = '["Estándar", "Seda", "Mate", "Marmolado", "Metálico", "Madera", "Fluorescente"]'::jsonb WHERE id = 'PLA';
UPDATE materials SET variantes = '["Estándar", "Resistente al impacto", "Alta temperatura"]'::jsonb WHERE id = 'PLA+';
UPDATE materials SET variantes = '["Estándar", "Transparente", "CF (fibra carbono)"]'::jsonb WHERE id = 'PETG';
UPDATE materials SET variantes = '["Estándar", "ABS+", "CF (fibra carbono)"]'::jsonb WHERE id = 'ABS';
UPDATE materials SET variantes = '["Shore 95A", "Shore 85A (suave)", "Shore 60A (muy suave)"]'::jsonb WHERE id = 'TPU';
UPDATE materials SET variantes = '["Estándar", "ABS-Like", "Flexible", "Transparente", "Water-Washable"]'::jsonb WHERE id = 'Resina';
UPDATE materials SET variantes = '["Estándar", "CF (fibra carbono)"]'::jsonb WHERE id = 'ASA';
UPDATE materials SET variantes = '["PA6", "PA12", "PA6-CF", "PA12-CF"]'::jsonb WHERE id = 'Nylon';

-- Add publication for realtime if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'materials'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
  END IF;
END $$;