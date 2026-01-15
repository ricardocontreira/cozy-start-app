-- Add client_invite_limit to planner_profiles
ALTER TABLE public.planner_profiles
ADD COLUMN IF NOT EXISTS client_invite_limit integer DEFAULT 5;

-- Add invited_by_planner_id to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS invited_by_planner_id uuid REFERENCES public.planner_profiles(id) ON DELETE SET NULL;

-- Create planner_invites table
CREATE TABLE IF NOT EXISTS public.planner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id uuid NOT NULL REFERENCES public.planner_profiles(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text) FROM 1 FOR 8)),
  used_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on planner_invites
ALTER TABLE public.planner_invites ENABLE ROW LEVEL SECURITY;

-- Planners can view their own invites
CREATE POLICY "Planners can view their own invites"
ON public.planner_invites
FOR SELECT
USING (planner_id = auth.uid());

-- Planner admins can view team invites
CREATE POLICY "Planner admins can view team invites"
ON public.planner_invites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.planner_profiles pp
    WHERE pp.id = planner_invites.planner_id
    AND pp.parent_planner_id = auth.uid()
  )
);

-- Planners can create their own invites
CREATE POLICY "Planners can create their own invites"
ON public.planner_invites
FOR INSERT
WITH CHECK (planner_id = auth.uid());

-- Planners can update their own invites
CREATE POLICY "Planners can update their own invites"
ON public.planner_invites
FOR UPDATE
USING (planner_id = auth.uid());

-- Planners can delete their own invites
CREATE POLICY "Planners can delete their own invites"
ON public.planner_invites
FOR DELETE
USING (planner_id = auth.uid());

-- Create function to use an invite code
CREATE OR REPLACE FUNCTION public.use_planner_invite(code text, client_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record RECORD;
  planner_uuid uuid;
BEGIN
  -- Find valid invite
  SELECT * INTO invite_record
  FROM public.planner_invites
  WHERE invite_code = upper(code)
    AND used_by IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  
  IF invite_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Mark invite as used
  UPDATE public.planner_invites
  SET used_by = client_user_id,
      used_at = now(),
      updated_at = now()
  WHERE id = invite_record.id;
  
  -- Update user profile with planner link
  UPDATE public.user_profiles
  SET invited_by_planner_id = invite_record.planner_id,
      updated_at = now()
  WHERE id = client_user_id;
  
  RETURN invite_record.planner_id;
END;
$$;

-- Create function to validate invite code (public, no auth required)
CREATE OR REPLACE FUNCTION public.validate_invite_code(code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record RECORD;
  planner_record RECORD;
BEGIN
  -- Find valid invite
  SELECT * INTO invite_record
  FROM public.planner_invites
  WHERE invite_code = upper(code)
    AND used_by IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  
  IF invite_record IS NULL THEN
    RETURN json_build_object('valid', false, 'message', 'Código inválido ou expirado');
  END IF;
  
  -- Get planner info
  SELECT full_name INTO planner_record
  FROM public.planner_profiles
  WHERE id = invite_record.planner_id;
  
  RETURN json_build_object(
    'valid', true,
    'planner_name', planner_record.full_name,
    'planner_id', invite_record.planner_id
  );
END;
$$;

-- Create function to get invite count for a planner
CREATE OR REPLACE FUNCTION public.get_planner_invite_stats(planner_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_used integer;
  total_active integer;
  invite_limit integer;
BEGIN
  -- Get invite limit
  SELECT client_invite_limit INTO invite_limit
  FROM public.planner_profiles
  WHERE id = planner_uuid;
  
  -- Count used invites
  SELECT COUNT(*) INTO total_used
  FROM public.planner_invites
  WHERE planner_id = planner_uuid AND used_by IS NOT NULL;
  
  -- Count active (unused, not expired) invites
  SELECT COUNT(*) INTO total_active
  FROM public.planner_invites
  WHERE planner_id = planner_uuid 
    AND used_by IS NULL 
    AND (expires_at IS NULL OR expires_at > now());
  
  RETURN json_build_object(
    'used', total_used,
    'active', total_active,
    'limit', invite_limit
  );
END;
$$;

-- Add RLS policy for user_profiles to allow planners to view their clients
CREATE POLICY "Planners can view their clients"
ON public.user_profiles
FOR SELECT
USING (invited_by_planner_id = auth.uid());

-- Planner admins can view clients of their team
CREATE POLICY "Planner admins can view team clients"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.planner_profiles pp
    WHERE pp.id = user_profiles.invited_by_planner_id
    AND pp.parent_planner_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_planner_invites_updated_at
BEFORE UPDATE ON public.planner_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();