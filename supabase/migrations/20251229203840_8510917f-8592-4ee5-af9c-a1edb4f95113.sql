-- Permitir que membros de uma casa vejam os perfis de outros membros da mesma casa
CREATE POLICY "House members can view each other profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.house_members hm1
    INNER JOIN public.house_members hm2 ON hm1.house_id = hm2.house_id
    WHERE hm1.user_id = auth.uid()
      AND hm2.user_id = profiles.id
  )
);