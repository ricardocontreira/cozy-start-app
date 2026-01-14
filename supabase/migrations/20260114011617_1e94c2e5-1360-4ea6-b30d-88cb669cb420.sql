-- Criar tabela financial_goals
CREATE TABLE public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  initial_capital NUMERIC NOT NULL DEFAULT 0,
  target_amount NUMERIC NOT NULL,
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Membros podem visualizar metas da casa"
ON public.financial_goals FOR SELECT
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Donos podem criar metas"
ON public.financial_goals FOR INSERT
WITH CHECK (
  get_house_role(auth.uid(), house_id) = 'owner'::app_role
  AND auth.uid() = user_id
);

CREATE POLICY "Donos podem atualizar metas"
ON public.financial_goals FOR UPDATE
USING (get_house_role(auth.uid(), house_id) = 'owner'::app_role);

CREATE POLICY "Donos podem excluir metas"
ON public.financial_goals FOR DELETE
USING (get_house_role(auth.uid(), house_id) = 'owner'::app_role);

-- Trigger para updated_at
CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();