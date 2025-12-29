-- Create a secure function to get invite code (only for owners)
CREATE OR REPLACE FUNCTION public.get_house_invite_code(house_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code text;
BEGIN
  -- Only return invite code if user is owner
  SELECT h.invite_code INTO code
  FROM public.houses h
  INNER JOIN public.house_members hm ON hm.house_id = h.id
  WHERE h.id = house_id_param
    AND hm.user_id = auth.uid()
    AND hm.role = 'owner';
  
  RETURN code;
END;
$$;