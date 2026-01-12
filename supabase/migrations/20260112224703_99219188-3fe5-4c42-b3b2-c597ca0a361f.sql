-- Add policy requiring authentication for profiles table
CREATE POLICY "Require authentication to view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);