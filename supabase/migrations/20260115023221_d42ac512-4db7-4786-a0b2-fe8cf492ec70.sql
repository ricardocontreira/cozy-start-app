-- Fix get_client_monthly_expenses function to use correct column name
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
      AND to_char(transaction_date, 'YYYY-MM') = target_month
    GROUP BY category
    ORDER BY category_total DESC
  ) t;

  RETURN COALESCE(result, json_build_object('total', 0, 'categories', '[]'::json));
END;
$$;