DROP POLICY IF EXISTS "Anyone can view active stories" ON public.stories;
DROP POLICY IF EXISTS "Users can create own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;

CREATE POLICY "Authenticated can view active stories" ON public.stories
  FOR SELECT TO authenticated USING (expires_at > now());

CREATE POLICY "Users can create own stories" ON public.stories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON public.stories
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.stories FROM anon;