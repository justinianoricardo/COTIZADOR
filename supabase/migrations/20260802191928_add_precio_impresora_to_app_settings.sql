/*
# Add precio_impresora column to app_settings

1. Modified Tables
- `app_settings`: add `precio_impresora` column (numeric, default 6500)
  - Stores the printer purchase price in Bs
  - Used to automatically compute the hourly wear cost (desgaste_por_hora)
    from a component lifespan table, instead of using a manually-entered flat value.
  - Existing rows get the default value of 6500 Bs.
2. Security
- No RLS policy changes — app_settings already has CRUD policies for anon + authenticated.
3. Notes
- The existing `desgaste_por_hora` column is kept for backwards compatibility;
  going forward its value is derived from `precio_impresora` via a component
  wear table defined in the application code.
*/

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS precio_impresora numeric DEFAULT 6500;
