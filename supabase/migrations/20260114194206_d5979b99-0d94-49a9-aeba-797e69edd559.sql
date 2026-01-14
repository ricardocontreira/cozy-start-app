-- Add phone and birth_date columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone text,
ADD COLUMN birth_date date;