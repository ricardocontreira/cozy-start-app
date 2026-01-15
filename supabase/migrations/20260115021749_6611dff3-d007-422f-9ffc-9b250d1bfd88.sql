-- Update get_planner_invite_stats to count linked clients (in use) instead of used invites
-- "em uso" = clients currently linked to the planner via invited_by_planner_id
CREATE OR REPLACE FUNCTION public.get_planner_invite_stats(planner_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_in_use integer;
  total_active integer;
  invite_limit integer;
BEGIN
  -- Get invite limit
  SELECT client_invite_limit INTO invite_limit
  FROM public.planner_profiles
  WHERE id = planner_uuid;
  
  -- Count clients currently linked to this planner (convites em uso)
  SELECT COUNT(*) INTO total_in_use
  FROM public.user_profiles
  WHERE invited_by_planner_id = planner_uuid;
  
  -- Count active (unused, not expired) invites pending
  SELECT COUNT(*) INTO total_active
  FROM public.planner_invites
  WHERE planner_id = planner_uuid 
    AND used_by IS NULL 
    AND (expires_at IS NULL OR expires_at > now());
  
  RETURN json_build_object(
    'used', total_in_use,
    'active', total_active,
    'limit', invite_limit
  );
END;
$$;

-- Create function to allow planners to unlink their clients
CREATE OR REPLACE FUNCTION public.unlink_planner_client(client_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  planner_uuid uuid;
BEGIN
  -- Get the calling user's ID
  planner_uuid := auth.uid();
  
  IF planner_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the client is actually linked to this planner
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = client_user_id AND invited_by_planner_id = planner_uuid
  ) THEN
    -- Also check if caller is a planner admin with access to this client via team member
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.planner_profiles pp ON pp.id = up.invited_by_planner_id
      WHERE up.id = client_user_id AND pp.parent_planner_id = planner_uuid
    ) THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Unlink the client
  UPDATE public.user_profiles
  SET invited_by_planner_id = NULL,
      updated_at = now()
  WHERE id = client_user_id
    AND (
      invited_by_planner_id = planner_uuid
      OR invited_by_planner_id IN (
        SELECT id FROM public.planner_profiles WHERE parent_planner_id = planner_uuid
      )
    );
  
  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.unlink_planner_client(uuid) TO authenticated;