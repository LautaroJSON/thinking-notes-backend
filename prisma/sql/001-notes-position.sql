-- Orden manual de las notas (feature: reordenar notas arrastrando)
-- Aplicar una sola vez en Supabase (SQL editor) y luego correr `npx prisma generate`.
-- Es idempotente salvo el backfill, que solo debe correrse al crear la columna.

BEGIN;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_notes_user_position
  ON public.notes (user_id, position);

-- Backfill: cada usuario conserva el orden que veía hasta ahora (más nuevas arriba)
UPDATE public.notes n
SET position = sub.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1 AS rn
  FROM public.notes
) sub
WHERE n.id = sub.id;

COMMIT;
