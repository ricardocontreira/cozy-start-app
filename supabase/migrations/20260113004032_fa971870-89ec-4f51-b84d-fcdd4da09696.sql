-- Add trial_ends_at column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Update existing users to have trial already expired (they were created before trial system)
-- New users will get trial via the updated trigger

-- Drop and recreate the handle_new_user function to include trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, trial_ends_at)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NOW() + INTERVAL '7 days'
  );
  RETURN NEW;
END;
$$;

-- Update has_active_subscription function to include trial check
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND (
      subscription_status IN ('active', 'cancelling')
      OR trial_ends_at > NOW()
    )
  )
$$;