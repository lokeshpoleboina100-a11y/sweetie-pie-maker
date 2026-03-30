
-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('upi', 'cash', 'wallet');

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  customer_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  commission INTEGER NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'upi',
  upi_transaction_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Participants can view payments" ON public.payments
  FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = worker_id);

CREATE POLICY "Customers can create payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own payments" ON public.payments
  FOR UPDATE USING (auth.uid() = customer_id);

-- Updated_at trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
