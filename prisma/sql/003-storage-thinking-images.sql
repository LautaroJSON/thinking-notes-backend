-- Bucket privado para las imágenes de los pensamientos (feature: pegar
-- imágenes como pensamientos). Aplicar en Supabase (SQL editor).
-- Es idempotente: se puede correr más de una vez.
--
-- Rutas: <userId>/<noteId>/<uuid>.(webp|jpg|png)
-- Cada usuario solo puede leer, subir y borrar dentro de su carpeta <userId>/.
-- No hay política de UPDATE: los archivos no se reemplazan.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thinking-images',
  'thinking-images',
  false,
  2097152, -- 2 MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "thinking_images_select_own" ON storage.objects;
CREATE POLICY "thinking_images_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'thinking-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "thinking_images_insert_own" ON storage.objects;
CREATE POLICY "thinking_images_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'thinking-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "thinking_images_delete_own" ON storage.objects;
CREATE POLICY "thinking_images_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'thinking-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
