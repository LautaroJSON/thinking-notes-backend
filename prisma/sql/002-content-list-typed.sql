-- Pensamientos tipados (feature: pegar imágenes como pensamientos)
-- Convierte cada elemento string de notes.content_list en
--   {"id": "<uuid>", "type": "text", "value": "<texto>"}
-- conservando el orden. Aplicar una sola vez en Supabase (SQL editor) ANTES de
-- desplegar el backend que valida el formato nuevo.
-- Es idempotente: solo toca filas con algún elemento string, y los objetos ya
-- migrados se dejan tal cual.

BEGIN;

UPDATE public.notes n
SET content_list = sub.migrated
FROM (
  SELECT
    notes.id,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'string' THEN jsonb_build_object(
            'id', gen_random_uuid()::text,
            'type', 'text',
            'value', elem #>> '{}'
          )
          ELSE elem
        END
        ORDER BY ord
      ),
      '[]'::jsonb
    ) AS migrated
  FROM public.notes
  CROSS JOIN LATERAL jsonb_array_elements(notes.content_list)
    WITH ORDINALITY AS t(elem, ord)
  WHERE jsonb_typeof(notes.content_list) = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(notes.content_list) e
      WHERE jsonb_typeof(e) = 'string'
    )
  GROUP BY notes.id
) sub
WHERE n.id = sub.id;

-- Listas nulas o que no son array pasan a lista vacía
UPDATE public.notes
SET content_list = '[]'::jsonb
WHERE content_list IS NULL OR jsonb_typeof(content_list) <> 'array';

COMMIT;

-- Verificación: debe devolver 0
-- SELECT count(*)
-- FROM public.notes, jsonb_array_elements(content_list) e
-- WHERE jsonb_typeof(e) = 'string';
