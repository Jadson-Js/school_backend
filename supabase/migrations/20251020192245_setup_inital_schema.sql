-- WARNING: This SCHEMA is for CONTEXT ONLY and is NOT meant to be RUN.
-- TABLE ORDER and CONSTRAINTS may NOT be VALID for EXECUTION.

CREATE TABLE PUBLIC.profiles (
  user_id UUID NOT NULL DEFAULT auth.UID(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE PUBLIC.lesson_plans (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.UID(),
  topic TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  learning_context TEXT,
  duration_minutes SMALLINT,
  generated_content JSONB NOT NULL,
  prompt_debug TEXT NOT NULL,
  CONSTRAINT lesson_plans_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
