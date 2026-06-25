
DROP POLICY IF EXISTS "Chat attachments readable by participants" ON storage.objects;
CREATE POLICY "Chat attachments readable by participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.can_access_job_chat((storage.foldername(name))[1]::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Chat attachments insertable by participants" ON storage.objects;
CREATE POLICY "Chat attachments insertable by participants"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.can_access_job_chat((storage.foldername(name))[1]::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Chat attachments deletable by uploader" ON storage.objects;
CREATE POLICY "Chat attachments deletable by uploader"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND owner = auth.uid()
);
