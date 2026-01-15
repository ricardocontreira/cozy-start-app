-- Function to get client email (from auth.users)
CREATE OR REPLACE FUNCTION public.get_client_email(client_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = client_id
$$;

-- Function to get client's house_id
CREATE OR REPLACE FUNCTION public.get_client_house_id(client_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT house_id FROM public.house_members 
  WHERE user_id = client_user_id AND role = 'owner'
  LIMIT 1
$$;

-- Function to get monthly expenses by category for a client
CREATE OR REPLACE FUNCTION public.get_client_monthly_expenses(
  client_user_id uuid,
  target_month text -- format: 'YYYY-MM'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  planner_id uuid := auth.uid();
  client_house uuid;
  result json;
BEGIN
  -- Verify planner has access to this client
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = client_user_id 
    AND (
      invited_by_planner_id = planner_id
      OR invited_by_planner_id IN (
        SELECT id FROM public.planner_profiles WHERE parent_planner_id = planner_id
      )
    )
  ) THEN
    RETURN NULL;
  END IF;

  -- Get client's house
  SELECT house_id INTO client_house
  FROM public.house_members
  WHERE user_id = client_user_id AND role = 'owner'
  LIMIT 1;

  IF client_house IS NULL THEN
    RETURN json_build_object('total', 0, 'categories', '[]'::json);
  END IF;

  -- Get expenses grouped by category for the target month
  SELECT json_build_object(
    'total', COALESCE(SUM(t.amount), 0),
    'categories', COALESCE(
      json_agg(
        json_build_object(
          'category', t.category,
          'total', t.category_total,
          'count', t.category_count
        )
      ) FILTER (WHERE t.category IS NOT NULL),
      '[]'::json
    )
  ) INTO result
  FROM (
    SELECT 
      category,
      SUM(amount) as category_total,
      COUNT(*) as category_count,
      SUM(amount) as amount
    FROM public.transactions
    WHERE house_id = client_house
      AND type = 'expense'
      AND to_char(date, 'YYYY-MM') = target_month
    GROUP BY category
    ORDER BY category_total DESC
  ) t;

  RETURN COALESCE(result, json_build_object('total', 0, 'categories', '[]'::json));
END;
$$;

-- Function to get client's financial goals with contributions
CREATE OR REPLACE FUNCTION public.get_client_financial_goals(client_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  planner_id uuid := auth.uid();
  client_house uuid;
  result json;
BEGIN
  -- Verify planner has access to this client
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = client_user_id 
    AND (
      invited_by_planner_id = planner_id
      OR invited_by_planner_id IN (
        SELECT id FROM public.planner_profiles WHERE parent_planner_id = planner_id
      )
    )
  ) THEN
    RETURN NULL;
  END IF;

  -- Get client's house
  SELECT house_id INTO client_house
  FROM public.house_members
  WHERE user_id = client_user_id AND role = 'owner'
  LIMIT 1;

  IF client_house IS NULL THEN
    RETURN '[]'::json;
  END IF;

  -- Get goals with total contributions
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', g.id,
        'title', g.title,
        'target_amount', g.target_amount,
        'initial_capital', g.initial_capital,
        'annual_interest_rate', g.annual_interest_rate,
        'deadline', g.deadline,
        'created_at', g.created_at,
        'total_contributions', COALESCE(c.total_contributions, 0),
        'current_capital', g.initial_capital + COALESCE(c.total_contributions, 0)
      )
      ORDER BY g.deadline ASC
    ),
    '[]'::json
  ) INTO result
  FROM public.financial_goals g
  LEFT JOIN (
    SELECT goal_id, SUM(amount) as total_contributions
    FROM public.goal_contributions
    GROUP BY goal_id
  ) c ON c.goal_id = g.id
  WHERE g.house_id = client_house;

  RETURN result;
END;
$$;