ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enable read access for all users"
ON public.profiles
AS permissive
FOR SELECT
TO public
USING (true);

CREATE POLICY "enable insert for users based on user_id"
ON public.profiles
AS permissive
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() = user_id)
  AND
  ((SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL)
);

CREATE POLICY "enable update access based on user_id"
ON public.profiles
AS permissive
FOR UPDATE
TO public
USING ((auth.uid() = user_id))
WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "allow full access for authenticated users on their own plans"
ON public.lesson_plans
AS permissive
FOR ALL
TO public
USING ((auth.uid() = user_id))
WITH CHECK ((auth.uid() = user_id));