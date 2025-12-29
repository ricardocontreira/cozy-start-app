-- Add type column to transactions table to distinguish expenses from income
ALTER TABLE public.transactions 
ADD COLUMN type text NOT NULL DEFAULT 'expense';

-- Add check constraint to ensure only valid types
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check CHECK (type IN ('expense', 'income'));