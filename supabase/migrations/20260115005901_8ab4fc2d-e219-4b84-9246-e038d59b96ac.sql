
-- 1. Create user_profiles table for normal users
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  birth_date date,
  avatar_url text,
  trial_ends_at timestamptz DEFAULT (NOW() + INTERVAL '7 days'),
  subscription_status text DEFAULT 'inactive',
  subscription_id text,
  stripe_customer_id text,
  bypass_subscription boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create planner_profiles table for planners
CREATE TABLE public.planner_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  cnpj text,
  razao_social text,
  planner_role text NOT NULL DEFAULT 'planner_admin' CHECK (planner_role IN ('planner_admin', 'planner')),
  parent_planner_id uuid REFERENCES public.planner_profiles(id) ON DELETE SET NULL,
  onboarding_complete boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on both tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "House members can view each other profiles"
ON public.user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM house_members hm1
    JOIN house_members hm2 ON hm1.house_id = hm2.house_id
    WHERE hm1.user_id = auth.uid() AND hm2.user_id = user_profiles.id
  )
);

-- 5. RLS policies for planner_profiles
CREATE POLICY "Planners can view their own profile"
ON public.planner_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Planners can update their own profile"
ON public.planner_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Planners can insert their own profile"
ON public.planner_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Planner admins can view their team planners"
ON public.planner_profiles FOR SELECT
USING (parent_planner_id = auth.uid());

CREATE POLICY "Planner admins can update their team planners"
ON public.planner_profiles FOR UPDATE
USING (parent_planner_id = auth.uid())
WITH CHECK (parent_planner_id = auth.uid());

-- 6. Helper functions
CREATE OR REPLACE FUNCTION public.is_normal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_planner_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.planner_profiles WHERE id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_planner_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT planner_role FROM public.planner_profiles WHERE id = _user_id
$$;

-- 7. Update has_active_subscription to use user_profiles
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = _user_id
    AND (
      bypass_subscription = true
      OR subscription_status IN ('active', 'cancelling')
      OR trial_ends_at > NOW()
    )
  )
$$;

-- 8. Update handle_new_user trigger to insert in correct table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_type text;
BEGIN
  role_type := COALESCE(NEW.raw_user_meta_data ->> 'profile_role', 'user');
  
  IF role_type IN ('planner_admin', 'planner') THEN
    -- Insert into planner_profiles
    INSERT INTO public.planner_profiles (
      id, 
      full_name, 
      planner_role, 
      parent_planner_id,
      onboarding_complete
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      role_type,
      (NEW.raw_user_meta_data ->> 'parent_planner_id')::uuid,
      false
    );
  ELSE
    -- Insert into user_profiles
    INSERT INTO public.user_profiles (
      id, 
      full_name, 
      phone, 
      birth_date, 
      trial_ends_at
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'phone',
      (NEW.raw_user_meta_data ->> 'birth_date')::date,
      NOW() + INTERVAL '7 days'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Migrate existing data from profiles to new tables
INSERT INTO public.user_profiles (
  id, full_name, phone, birth_date, avatar_url, trial_ends_at, 
  subscription_status, subscription_id, stripe_customer_id, bypass_subscription,
  created_at, updated_at
)
SELECT 
  id, full_name, phone, birth_date, avatar_url, trial_ends_at,
  subscription_status, subscription_id, stripe_customer_id, bypass_subscription,
  created_at, updated_at
FROM public.profiles 
WHERE profile_role = 'user'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.planner_profiles (
  id, full_name, cnpj, razao_social, planner_role, parent_planner_id,
  onboarding_complete, is_active, created_at, updated_at
)
SELECT 
  id, full_name, cnpj, razao_social, profile_role::text, parent_planner_id,
  COALESCE(planner_onboarding_complete, false), is_active, created_at, updated_at
FROM public.profiles 
WHERE profile_role IN ('planner_admin', 'planner')
ON CONFLICT (id) DO NOTHING;

-- 10. Create updated_at triggers for new tables
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planner_profiles_updated_at
BEFORE UPDATE ON public.planner_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
