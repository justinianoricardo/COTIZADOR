/*
# Cotizador 3D Pro - Schema for shared realtime data

1. Context
- Single-tenant: the app is intentionally shared across multiple users (cotizadores Ricardo/Rosario et al).
- No sign-in requested by the user. All rows are visible to every visitor via the anon key.
- Realtime enabled so multiple users see changes live.

2. New tables
- `jobs`        : one row per cotizacion / trabajo. Nested `lineas` (materials breakdown) and `extras` stored as JSONB since they always travel with the job.
- `inventory`   : one row per filament roll/carrete.
- `materials`   : one row per material type with cost per kg (editable in Configuracion).
- `app_settings`: single-row table holding global config (electricity, machine wear, alert threshold). Key = 'main'.

3. Columns
- `jobs`:
  - id text primary key (client-generated uid, keeps existing IDs stable across save loops)
  - cotizador text
  - cliente text
  - telefono text
  - email text
  - ciudad text
  - pieza text
  - descripcion text
  - cantidad int default 1
  - lineas jsonb (array of {id,nombre,tipo,color,gramos})
  - extras jsonb (array of {id,descripcion,costo})
  - horas numeric default 2
  - mano_obra numeric default 0
  - markup numeric default 40
  - notas text
  - fecha text
  - fecha_entrega text
  - estado text default 'Pendiente'
  - total numeric default 0
  - created_at timestamptz default now()
  - updated_at timestamptz default now()
- `inventory`:
  - id text primary key
  - material text
  - tipo text
  - color text
  - lote text
  - fecha text
  - gr_inicial numeric default 1000
  - gr_usado numeric default 0
  - gr_purga numeric default 0
  - created_at timestamptz default now()
  - updated_at timestamptz default now()
- `materials`:
  - id text primary key (e.g. 'PLA','PETG')
  - nombre text
  - costo numeric default 0
  - sort_order int default 0
- `app_settings`:
  - key text primary key default 'main'
  - electricidad_kwh numeric default 1.021
  - consumo_kw numeric default 0.15
  - desgaste_por_hora numeric default 3.5
  - alerta_gramos numeric default 100
  - colores_extra jsonb default '[]'
  - updated_at timestamptz default now()

4. Realtime
- ALTER TABLE ... REPLICA IDENTITY FULL so UPDATE/DELETE events carry full row data for realtime subscribers.

5. Security
- RLS enabled on every table.
- Policies allow anon + authenticated full CRUD because the app is intentionally shared/public (single-tenant, no auth).
- USING (true) / WITH CHECK (true) is acceptable and documented here for that reason.

6. Auto-updating updated_at
- Trigger function `set_updated_at()` bumps updated_at on every UPDATE.
*/

-- ---- extension for gen_random_uuid (available by default) ----
-- not strictly required since ids are text, but harmless

-- =========================================================
-- jobs
-- =========================================================
CREATE TABLE IF NOT EXISTS jobs (
  id text PRIMARY KEY,
  cotizador text DEFAULT '',
  cliente text DEFAULT '',
  telefono text DEFAULT '',
  email text DEFAULT '',
  ciudad text DEFAULT '',
  pieza text DEFAULT '',
  descripcion text DEFAULT '',
  cantidad int NOT NULL DEFAULT 1,
  lineas jsonb NOT NULL DEFAULT '[]'::jsonb,
  extras jsonb NOT NULL DEFAULT '[]'::jsonb,
  horas numeric NOT NULL DEFAULT 2,
  mano_obra numeric NOT NULL DEFAULT 0,
  markup numeric NOT NULL DEFAULT 40,
  notas text DEFAULT '',
  fecha text DEFAULT '',
  fecha_entrega text DEFAULT '',
  estado text NOT NULL DEFAULT 'Pendiente',
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "anon_select_jobs" ON jobs;
CREATE POLICY "anon_select_jobs" ON jobs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_jobs" ON jobs;
CREATE POLICY "anon_insert_jobs" ON jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_jobs" ON jobs;
CREATE POLICY "anon_update_jobs" ON jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_jobs" ON jobs;
CREATE POLICY "anon_delete_jobs" ON jobs FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- inventory
-- =========================================================
CREATE TABLE IF NOT EXISTS inventory (
  id text PRIMARY KEY,
  material text DEFAULT '',
  tipo text DEFAULT '',
  color text DEFAULT '',
  lote text DEFAULT '',
  fecha text DEFAULT '',
  gr_inicial numeric NOT NULL DEFAULT 1000,
  gr_usado numeric NOT NULL DEFAULT 0,
  gr_purga numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "anon_select_inventory" ON inventory;
CREATE POLICY "anon_select_inventory" ON inventory FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory;
CREATE POLICY "anon_insert_inventory" ON inventory FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inventory" ON inventory;
CREATE POLICY "anon_update_inventory" ON inventory FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory;
CREATE POLICY "anon_delete_inventory" ON inventory FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- materials
-- =========================================================
CREATE TABLE IF NOT EXISTS materials (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  costo numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "anon_select_materials" ON materials;
CREATE POLICY "anon_select_materials" ON materials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_materials" ON materials;
CREATE POLICY "anon_insert_materials" ON materials FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_materials" ON materials;
CREATE POLICY "anon_update_materials" ON materials FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_materials" ON materials;
CREATE POLICY "anon_delete_materials" ON materials FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- app_settings (single row)
-- =========================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY DEFAULT 'main',
  electricidad_kwh numeric NOT NULL DEFAULT 1.021,
  consumo_kw numeric NOT NULL DEFAULT 0.15,
  desgaste_por_hora numeric NOT NULL DEFAULT 3.5,
  alerta_gramos numeric NOT NULL DEFAULT 100,
  colores_extra jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "anon_select_app_settings" ON app_settings;
CREATE POLICY "anon_select_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_settings" ON app_settings;
CREATE POLICY "anon_insert_app_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_settings" ON app_settings;
CREATE POLICY "anon_update_app_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory;
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- seed default materials so the app is usable on first load
-- =========================================================
INSERT INTO materials (id, nombre, costo, sort_order) VALUES
  ('PLA',    'PLA',    80,  1),
  ('PLA+',   'PLA+',   110, 2),
  ('PETG',   'PETG',   120, 3),
  ('ABS',    'ABS',    100, 4),
  ('TPU',    'TPU',    150, 5),
  ('Resina', 'Resina', 200, 6),
  ('ASA',    'ASA',    130, 7),
  ('Nylon',  'Nylon',  160, 8)
ON CONFLICT (id) DO NOTHING;

-- seed default app_settings single row if not present
INSERT INTO app_settings (key) VALUES ('main')
ON CONFLICT (key) DO NOTHING;

-- Add publications for realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'materials'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
END $$;
