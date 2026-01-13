-- Adicionar coluna bypass_subscription na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN bypass_subscription boolean NOT NULL DEFAULT false;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.profiles.bypass_subscription IS 
  'Quando true, o usuário tem acesso completo sem precisar de assinatura ativa ou trial';

-- Atualizar função has_active_subscription para verificar bypass
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND (
      bypass_subscription = true
      OR subscription_status IN ('active', 'cancelling')
      OR trial_ends_at > NOW()
    )
  )
$$;