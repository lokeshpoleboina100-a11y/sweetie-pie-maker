DROP POLICY IF EXISTS "Authenticated users can view job photos" ON storage.objects;

CREATE POLICY "Authenticated users can view job photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    OR EXISTS (
      SELECT 1
      FROM public.jobs AS j
      WHERE name = ANY(j.images)
    )
  )
);