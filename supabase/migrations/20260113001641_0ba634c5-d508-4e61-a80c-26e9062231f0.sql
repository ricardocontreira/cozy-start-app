-- Add subscription fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS subscription_id text;

-- Create function to check active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND subscription_status = 'active'
  )
$$;

-- Drop existing policy for house creation
DROP POLICY IF EXISTS "Authenticated users can create houses" ON public.houses;

-- Create new policy that requires active subscription to create houses
CREATE POLICY "Active subscribers can create houses"
ON public.houses FOR INSERT
WITH CHECK (
  auth.uid() = owner_id 
  AND public.has_active_subscription(auth.uid())
);