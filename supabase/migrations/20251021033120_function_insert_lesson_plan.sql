CREATE OR REPLACE FUNCTION insert_lesson_plan (
  -- Parâmetros da requisição original
  p_topic TEXT,
  p_grade_level TEXT,
  p_subject TEXT,
  p_learning_context TEXT,
  p_duration_minutes SMALLINT,
  
  -- Parâmetros da IA
  p_generated_content JSONB,
  p_prompt_debug TEXT
)
RETURNS lesson_plans
LANGUAGE sql
SECURITY INVOKER
AS $$
  INSERT INTO public.lesson_plans (
    topic,
    grade_level,
    subject,
    learning_context,
    duration_minutes,
    generated_content,
    prompt_debug
  )
  VALUES (
    p_topic,
    p_grade_level,
    p_subject,
    p_learning_context,
    p_duration_minutes,
    p_generated_content,
    p_prompt_debug
  )
  RETURNING *;
$$;