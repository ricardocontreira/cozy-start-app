-- Add is_active column to profiles for deactivating planner accounts
ALTER TABLE public.profiles
ADD COLUMN is_active boolean NOT NULL DEFAULT true;