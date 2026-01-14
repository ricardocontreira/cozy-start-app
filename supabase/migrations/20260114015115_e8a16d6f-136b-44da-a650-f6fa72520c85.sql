-- Add annual interest rate column to financial_goals
ALTER TABLE public.financial_goals
ADD COLUMN annual_interest_rate NUMERIC NOT NULL DEFAULT 12;

COMMENT ON COLUMN public.financial_goals.annual_interest_rate IS 
'Taxa de juros anual em percentual (ex: 12 = 12% ao ano)';