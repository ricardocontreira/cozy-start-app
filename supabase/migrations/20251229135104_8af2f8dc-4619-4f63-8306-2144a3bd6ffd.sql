-- Add closing_day and due_day to credit_cards table
ALTER TABLE public.credit_cards
ADD COLUMN closing_day integer DEFAULT 20 CHECK (closing_day >= 1 AND closing_day <= 28),
ADD COLUMN due_day integer DEFAULT 10 CHECK (due_day >= 1 AND due_day <= 28);

-- Add billing_month to transactions table for caching/filtering
ALTER TABLE public.transactions
ADD COLUMN billing_month date;