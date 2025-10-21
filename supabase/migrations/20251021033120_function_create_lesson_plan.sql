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
RETURNS lesson_plans -- Retorna o plano de aula recém-criado
LANGUAGE sql
SECURITY INVOKER -- Essencial para que auth.uid() funcione corretamente
AS $$
  INSERT INTO public.lesson_plans (
    topic,
    grade_level,
    subject,
    learning_context,
    duration_minutes,
    generated_content,
    prompt_debug
    -- user_id é pego do DEFAULT auth.uid()
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
  RETURNING *; -- Retorna a linha completa que acabou de ser inserida
$$;