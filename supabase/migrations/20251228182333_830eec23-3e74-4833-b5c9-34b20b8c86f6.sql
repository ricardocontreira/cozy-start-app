-- Create upload_logs table first (for FK reference)
CREATE TABLE public.upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  items_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'undone', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  upload_id UUID REFERENCES public.upload_logs(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  installment TEXT,
  category TEXT DEFAULT 'Não classificado',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for upload_logs
CREATE POLICY "House members can view upload logs"
ON public.upload_logs FOR SELECT
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "House owners can create upload logs"
ON public.upload_logs FOR INSERT
WITH CHECK (get_house_role(auth.uid(), house_id) = 'owner' AND auth.uid() = user_id);

CREATE POLICY "House owners can update upload logs"
ON public.upload_logs FOR UPDATE
USING (get_house_role(auth.uid(), house_id) = 'owner');

CREATE POLICY "House owners can delete upload logs"
ON public.upload_logs FOR DELETE
USING (get_house_role(auth.uid(), house_id) = 'owner');

-- RLS Policies for transactions
CREATE POLICY "House members can view transactions"
ON public.transactions FOR SELECT
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "House owners can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (get_house_role(auth.uid(), house_id) = 'owner' AND auth.uid() = created_by);

CREATE POLICY "House owners can update transactions"
ON public.transactions FOR UPDATE
USING (get_house_role(auth.uid(), house_id) = 'owner');

CREATE POLICY "House owners can delete transactions"
ON public.transactions FOR DELETE
USING (get_house_role(auth.uid(), house_id) = 'owner');

-- Create indexes for performance
CREATE INDEX idx_transactions_house_id ON public.transactions(house_id);
CREATE INDEX idx_transactions_card_id ON public.transactions(card_id);
CREATE INDEX idx_transactions_upload_id ON public.transactions(upload_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_upload_logs_house_id ON public.upload_logs(house_id);
CREATE INDEX idx_upload_logs_card_id ON public.upload_logs(card_id);

-- Trigger for updated_at on transactions
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();