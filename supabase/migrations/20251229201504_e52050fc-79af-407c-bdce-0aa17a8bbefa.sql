-- Adicionar campo para vincular transações recorrentes
ALTER TABLE public.transactions 
ADD COLUMN recurrence_id uuid DEFAULT NULL;

-- Índice para buscas por recurrence_id
CREATE INDEX idx_transactions_recurrence_id ON public.transactions(recurrence_id);