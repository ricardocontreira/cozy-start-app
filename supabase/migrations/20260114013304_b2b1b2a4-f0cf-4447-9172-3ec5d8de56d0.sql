-- Create goal_contributions table
CREATE TABLE public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.financial_goals(id) ON DELETE CASCADE,
  house_id UUID NOT NULL,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  contribution_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Membros podem visualizar aportes da casa"
ON public.goal_contributions
FOR SELECT
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Donos podem criar aportes"
ON public.goal_contributions
FOR INSERT
WITH CHECK (
  (get_house_role(auth.uid(), house_id) = 'owner'::app_role) 
  AND (auth.uid() = user_id)
);

CREATE POLICY "Donos podem atualizar aportes"
ON public.goal_contributions
FOR UPDATE
USING (get_house_role(auth.uid(), house_id) = 'owner'::app_role);

CREATE POLICY "Donos podem excluir aportes"
ON public.goal_contributions
FOR DELETE
USING (get_house_role(auth.uid(), house_id) = 'owner'::app_role);

-- Trigger for updated_at
CREATE TRIGGER update_goal_contributions_updated_at
BEFORE UPDATE ON public.goal_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();