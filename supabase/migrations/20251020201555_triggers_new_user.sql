
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES ( NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Usuário'));
  RETURN NEW;
END;
$$ 
LANGUAGE plpgsql 
SECURITY DEFINER;


CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();