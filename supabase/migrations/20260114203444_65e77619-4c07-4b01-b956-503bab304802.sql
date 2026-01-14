-- Create profile_role enum
CREATE TYPE public.profile_role AS ENUM ('user', 'planner_admin', 'planner');

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN profile_role public.profile_role NOT NULL DEFAULT 'user',
ADD COLUMN cnpj text,
ADD COLUMN razao_social text,
ADD COLUMN parent_planner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN planner_onboarding_complete boolean DEFAULT false;

-- Create index for parent_planner_id lookups
CREATE INDEX idx_profiles_parent_planner ON public.profiles(parent_planner_id) WHERE parent_planner_id IS NOT NULL;

-- Create security definer function to get profile role
CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS public.profile_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT profile_role FROM public.profiles WHERE id = _user_id
$$;

-- Create security definer function to check if user is planner admin
CREATE OR REPLACE FUNCTION public.is_planner_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND profile_role = 'planner_admin'
  )
$$;

-- Create security definer function to check if user is any type of planner
CREATE OR REPLACE FUNCTION public.is_planner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND profile_role IN ('planner_admin', 'planner')
  )
$$;

-- Update handle_new_user trigger to support profile_role and parent_planner_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    phone, 
    birth_date, 
    trial_ends_at,
    profile_role,
    parent_planner_id
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    (NEW.raw_user_meta_data ->> 'birth_date')::date,
    NOW() + INTERVAL '7 days',
    COALESCE((NEW.raw_user_meta_data ->> 'profile_role')::public.profile_role, 'user'),
    (NEW.raw_user_meta_data ->> 'parent_planner_id')::uuid
  );
  RETURN NEW;
END;
$$;

-- Add RLS policy for planner admins to view their assistant planners
CREATE POLICY "Planner admins can view their planners"
ON public.profiles
FOR SELECT
USING (
  parent_planner_id = auth.uid() 
  AND is_planner_admin(auth.uid())
);

-- Add RLS policy for planner admins to update their assistant planners
CREATE POLICY "Planner admins can update their planners"
ON public.profiles
FOR UPDATE
USING (
  parent_planner_id = auth.uid() 
  AND is_planner_admin(auth.uid())
);