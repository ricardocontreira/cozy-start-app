-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'viewer');

-- Create enum for credit card brands
CREATE TYPE public.card_brand AS ENUM ('visa', 'mastercard', 'elo');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create houses table
CREATE TABLE public.houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create house_members table
CREATE TABLE public.house_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(house_id, user_id)
);

-- Create user_roles table (separate from house roles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand card_brand NOT NULL,
  last_digits TEXT NOT NULL CHECK (length(last_digits) = 4),
  color TEXT NOT NULL DEFAULT '#059669',
  icon TEXT DEFAULT 'credit-card',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- Security definer function to check house membership
CREATE OR REPLACE FUNCTION public.is_house_member(_user_id UUID, _house_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE user_id = _user_id AND house_id = _house_id
  )
$$;

-- Security definer function to check house role
CREATE OR REPLACE FUNCTION public.get_house_role(_user_id UUID, _house_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.house_members
  WHERE user_id = _user_id AND house_id = _house_id
$$;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_houses_updated_at
  BEFORE UPDATE ON public.houses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for houses
CREATE POLICY "House members can view their houses"
  ON public.houses FOR SELECT
  USING (public.is_house_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create houses"
  ON public.houses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "House owners can update their houses"
  ON public.houses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "House owners can delete their houses"
  ON public.houses FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for house_members
CREATE POLICY "House members can view other members"
  ON public.house_members FOR SELECT
  USING (public.is_house_member(auth.uid(), house_id));

CREATE POLICY "House owners can add members"
  ON public.house_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.houses 
      WHERE id = house_id AND owner_id = auth.uid()
    )
    OR 
    (auth.uid() = user_id AND role = 'viewer')
  );

CREATE POLICY "House owners can update members"
  ON public.house_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.houses 
      WHERE id = house_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "House owners can remove members"
  ON public.house_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.houses 
      WHERE id = house_id AND owner_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for credit_cards
CREATE POLICY "House members can view cards"
  ON public.credit_cards FOR SELECT
  USING (public.is_house_member(auth.uid(), house_id));

CREATE POLICY "House owners can create cards"
  ON public.credit_cards FOR INSERT
  WITH CHECK (
    public.get_house_role(auth.uid(), house_id) = 'owner'
    AND auth.uid() = created_by
  );

CREATE POLICY "House owners can update cards"
  ON public.credit_cards FOR UPDATE
  USING (public.get_house_role(auth.uid(), house_id) = 'owner');

CREATE POLICY "House owners can delete cards"
  ON public.credit_cards FOR DELETE
  USING (public.get_house_role(auth.uid(), house_id) = 'owner');

-- Function to create house and add owner as member
CREATE OR REPLACE FUNCTION public.create_house_with_owner(house_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_house_id UUID;
BEGIN
  -- Create the house
  INSERT INTO public.houses (name, owner_id)
  VALUES (house_name, auth.uid())
  RETURNING id INTO new_house_id;
  
  -- Add owner as member with 'owner' role
  INSERT INTO public.house_members (house_id, user_id, role)
  VALUES (new_house_id, auth.uid(), 'owner');
  
  RETURN new_house_id;
END;
$$;

-- Function to join house by invite code
CREATE OR REPLACE FUNCTION public.join_house_by_code(code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_house_id UUID;
BEGIN
  -- Find the house by invite code
  SELECT id INTO found_house_id
  FROM public.houses
  WHERE invite_code = upper(code);
  
  IF found_house_id IS NULL THEN
    RAISE EXCEPTION 'Código de convite inválido';
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = found_house_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Você já é membro desta Casa';
  END IF;
  
  -- Add user as viewer
  INSERT INTO public.house_members (house_id, user_id, role)
  VALUES (found_house_id, auth.uid(), 'viewer');
  
  RETURN found_house_id;
END;
$$;