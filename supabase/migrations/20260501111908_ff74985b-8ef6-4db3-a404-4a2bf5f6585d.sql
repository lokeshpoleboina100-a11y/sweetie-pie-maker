-- Milestone status enum
CREATE TYPE public.milestone_status AS ENUM ('pending','in_progress','submitted','approved','released');
CREATE TYPE public.escrow_tx_type AS ENUM ('fund','release','refund');

-- Add escrow balance to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS escrow_balance INTEGER NOT NULL DEFAULT 0;

-- Milestones table
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  worker_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  due_date DATE,
  order_index INTEGER NOT NULL DEFAULT 0,
  status public.milestone_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_milestones_job ON public.milestones(job_id);

-- Escrow ledger
CREATE TABLE public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL,
  worker_id UUID,
  type public.escrow_tx_type NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_escrow_job ON public.escrow_transactions(job_id);

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_milestones_updated
BEFORE UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Milestones policies
CREATE POLICY "Parties can view milestones"
ON public.milestones FOR SELECT TO authenticated
USING (
  auth.uid() = customer_id
  OR auth.uid() = worker_id
  OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.accepted_worker_id = auth.uid())
);

CREATE POLICY "Customer creates milestones"
ON public.milestones FOR INSERT TO authenticated
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customer updates milestones"
ON public.milestones FOR UPDATE TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Worker can submit milestone"
ON public.milestones FOR UPDATE TO authenticated
USING (auth.uid() = worker_id)
WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Customer deletes pending milestones"
ON public.milestones FOR DELETE TO authenticated
USING (auth.uid() = customer_id AND status = 'pending');

-- Escrow tx policies
CREATE POLICY "Parties view escrow tx"
ON public.escrow_transactions FOR SELECT TO authenticated
USING (auth.uid() = customer_id OR auth.uid() = worker_id);

CREATE POLICY "Customer creates escrow tx"
ON public.escrow_transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = customer_id);
