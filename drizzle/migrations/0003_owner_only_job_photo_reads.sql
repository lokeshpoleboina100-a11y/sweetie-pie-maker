DROP POLICY IF EXISTS "Authenticated users can view job photos" ON storage.objects;
DROP POLICY IF EXISTS "Job photo owners can view their uploads" ON storage.objects;

CREATE POLICY "Job photo owners can view their uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);