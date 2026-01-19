-- ================================================
-- ATUALIZAR PERMISSÕES: Membros têm mesmas permissões do proprietário
-- ================================================

-- DROP políticas antigas que restringem a 'owner' apenas

-- TRANSACTIONS
DROP POLICY IF EXISTS "House owners can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "House owners can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "House owners can delete transactions" ON public.transactions;

CREATE POLICY "House members can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (is_house_member(auth.uid(), house_id) AND auth.uid() = created_by);

CREATE POLICY "House members can update transactions"
ON public.transactions FOR UPDATE
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "House members can delete transactions"
ON public.transactions FOR DELETE
USING (is_house_member(auth.uid(), house_id));

-- CREDIT_CARDS
DROP POLICY IF EXISTS "House owners can create cards" ON public.credit_cards;
DROP POLICY IF EXISTS "House owners can update cards" ON public.credit_cards;
DROP POLICY IF EXISTS "House owners can delete cards" ON public.credit_cards;

CREATE POLICY "House members can create cards"
ON public.credit_cards FOR INSERT
WITH CHECK (is_house_member(auth.uid(), house_id) AND auth.uid() = created_by);

CREATE POLICY "House members can update cards"
ON public.credit_cards FOR UPDATE
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "House members can delete cards"
ON public.credit_cards FOR DELETE
USING (is_house_member(auth.uid(), house_id));

-- UPLOAD_LOGS
DROP POLICY IF EXISTS "House owners can create upload logs" ON public.upload_logs;
DROP POLICY IF EXISTS "House owners can update upload logs" ON public.upload_logs;
DROP POLICY IF EXISTS "House owners can delete upload logs" ON public.upload_logs;

CREATE POLICY "House members can create upload logs"
ON public.upload_logs FOR INSERT
WITH CHECK (is_house_member(auth.uid(), house_id) AND auth.uid() = user_id);

CREATE POLICY "House members can update upload logs"
ON public.upload_logs FOR UPDATE
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "House members can delete upload logs"
ON public.upload_logs FOR DELETE
USING (is_house_member(auth.uid(), house_id));

-- FINANCIAL_GOALS
DROP POLICY IF EXISTS "Donos podem criar metas" ON public.financial_goals;
DROP POLICY IF EXISTS "Donos podem atualizar metas" ON public.financial_goals;
DROP POLICY IF EXISTS "Donos podem excluir metas" ON public.financial_goals;

CREATE POLICY "Membros podem criar metas"
ON public.financial_goals FOR INSERT
WITH CHECK (is_house_member(auth.uid(), house_id) AND auth.uid() = user_id);

CREATE POLICY "Membros podem atualizar metas"
ON public.financial_goals FOR UPDATE
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Membros podem excluir metas"
ON public.financial_goals FOR DELETE
USING (is_house_member(auth.uid(), house_id));

-- GOAL_CONTRIBUTIONS
DROP POLICY IF EXISTS "Donos podem criar aportes" ON public.goal_contributions;
DROP POLICY IF EXISTS "Donos podem atualizar aportes" ON public.goal_contributions;
DROP POLICY IF EXISTS "Donos podem excluir aportes" ON public.goal_contributions;

CREATE POLICY "Membros podem criar aportes"
ON public.goal_contributions FOR INSERT
WITH CHECK (is_house_member(auth.uid(), house_id) AND auth.uid() = user_id);

CREATE POLICY "Membros podem atualizar aportes"
ON public.goal_contributions FOR UPDATE
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Membros podem excluir aportes"
ON public.goal_contributions FOR DELETE
USING (is_house_member(auth.uid(), house_id));