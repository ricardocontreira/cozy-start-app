-- Drop the existing policy that's causing issues
DROP POLICY IF EXISTS "Planner admins can update their planners" ON public.profiles;

-- Recreate with proper USING and WITH CHECK to allow removing planners
-- The USING clause checks current state (parent_planner_id = auth.uid())
-- The WITH CHECK allows the new state to have null parent_planner_id (removal)
CREATE POLICY "Planner admins can update their planners"
ON public.profiles
FOR UPDATE
USING (
  parent_planner_id = auth.uid() 
  AND is_planner_admin(auth.uid())
)
WITH CHECK (
  -- Allow the update if:
  -- 1. The planner is being removed (parent_planner_id set to null, role to user)
  -- 2. OR the planner is still linked to the same admin
  (
    (parent_planner_id IS NULL AND profile_role = 'user')
    OR parent_planner_id = auth.uid()
  )
  AND is_planner_admin(auth.uid())
);