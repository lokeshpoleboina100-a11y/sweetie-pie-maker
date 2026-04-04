
-- Stories / Status table (24-hour posts)
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT DEFAULT '',
  viewers UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Everyone can view non-expired stories
CREATE POLICY "Anyone can view active stories"
  ON public.stories FOR SELECT
  TO public
  USING (expires_at > now());

-- Users can create their own stories
CREATE POLICY "Users can create own stories"
  ON public.stories FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Users can update own stories (for adding viewers)
CREATE POLICY "Users can update own stories"
  ON public.stories FOR UPDATE
  TO public
  USING (auth.uid() = user_id OR auth.uid() = ANY(viewers) OR true);

-- Users can delete own stories
CREATE POLICY "Users can delete own stories"
  ON public.stories FOR DELETE
  TO public
  USING (auth.uid() = user_id);
