-- Server-side bid price validation with clear error messages.
CREATE OR REPLACE FUNCTION public.validate_bid_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.amount IS NULL THEN
    RAISE EXCEPTION 'Bid amount is required. Please enter your price in rupees.';
  END IF;
  IF NEW.amount < 1 THEN
    RAISE EXCEPTION 'Bid amount must be at least Rs 1.';
  END IF;
  IF NEW.amount > 10000000 THEN
    RAISE EXCEPTION 'Bid amount cannot exceed Rs 1,00,00,000.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_bid_amount_trigger ON public.bids;
CREATE TRIGGER validate_bid_amount_trigger
  BEFORE INSERT OR UPDATE OF amount ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.validate_bid_amount();

REVOKE ALL ON FUNCTION public.validate_bid_amount() FROM PUBLIC, anon, authenticated;