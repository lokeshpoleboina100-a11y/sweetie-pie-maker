
-- 1. Fix stories UPDATE policy (remove OR true)
DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
CREATE POLICY "Users can update own stories"
ON public.stories FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow viewers to update only the viewers array (for view tracking) via separate policy
CREATE POLICY "Viewers can mark stories viewed"
ON public.stories FOR UPDATE
TO authenticated
USING (expires_at > now())
WITH CHECK (expires_at > now());
-- Note: above is permissive for viewer tracking; restrict updatable cols at app layer.
-- To be strict, drop it:
DROP POLICY IF EXISTS "Viewers can mark stories viewed" ON public.stories;

-- 2. Fix reviews: only job participants of completed jobs can review
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Job participants can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE id = reviews.job_id
        AND status = 'completed'
        AND customer_id = auth.uid()
        AND reviews.reviewee_id = jobs.accepted_worker_id
    )
    OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE id = reviews.job_id
        AND status = 'completed'
        AND accepted_worker_id = auth.uid()
        AND reviews.reviewee_id = jobs.customer_id
    )
  )
);

-- Prevent duplicate reviews
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_job_reviewer
ON public.reviews (job_id, reviewer_id);

-- 3. Fix bids: require worker role
DROP POLICY IF EXISTS "Workers can place bids" ON public.bids;
CREATE POLICY "Workers can place bids"
ON public.bids FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = worker_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'worker'
  )
);

-- 4. Profiles: restrict SELECT to authenticated users (prevents anon phone scraping)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 5. Messages: restrict UPDATE to chat participants only
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Chat participants can update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  auth.uid() <> sender_id
  AND (
    auth.uid() IN (SELECT customer_id FROM public.jobs WHERE id = messages.job_id)
    OR auth.uid() IN (SELECT accepted_worker_id FROM public.jobs WHERE id = messages.job_id)
  )
);

-- 6. Avatars storage DELETE policy
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
