-- Function to regenerate invite code (only for house owners)
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(house_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
BEGIN
  -- Check if user is owner
  IF NOT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = house_id_param
    AND user_id = auth.uid()
    AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Apenas proprietários podem regenerar o código';
  END IF;
  
  -- Generate new code
  new_code := upper(SUBSTRING(md5(random()::text) FROM 1 FOR 8));
  
  -- Update house
  UPDATE public.houses
  SET invite_code = new_code, updated_at = now()
  WHERE id = house_id_param;
  
  RETURN new_code;
END;
$$;