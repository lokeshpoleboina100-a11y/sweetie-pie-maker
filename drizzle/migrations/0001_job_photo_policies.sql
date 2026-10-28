create policy "Users can upload their job photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Authenticated users can view job photos"
on storage.objects for select to authenticated
using (bucket_id = 'job-photos');

create policy "Users can update their job photos"
on storage.objects for update to authenticated
using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their job photos"
on storage.objects for delete to authenticated
using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);