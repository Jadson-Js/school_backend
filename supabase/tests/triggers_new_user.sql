BEGIN;

-- 1. Setup do pgTAP
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Vamos rodar apenas 1 teste: O perfil foi criado?
SELECT plan(1);

-- --- Início dos Testes ---

-- 2. AÇÃO: Inserir um novo usuário em auth.users
-- Este INSERT é o que vai disparar seu trigger 'on_auth_user_created'
-- Usamos um UUID fixo diretamente.
INSERT INTO auth.users (id, email) 
VALUES ('a0000000-0000-0000-0000-000000000001', 'test_trigger@example.com');

-- 3. VERIFICAÇÃO: Checar se o trigger funcionou
-- Nós verificamos se a tabela 'public.profiles' agora contém
-- uma linha com o user_id que acabamos de inserir.
SELECT results_eq(
    -- Query 1: O que realmente está na tabela 'profiles'
    $$ 
        SELECT user_id 
        FROM public.profiles 
        WHERE user_id = 'a0000000-0000-0000-0000-000000000001' 
    $$,
    
    -- Query 2: O que esperamos que esteja lá (fazemos o cast para uuid)
    $$ 
        VALUES ('a0000000-0000-0000-0000-000000000001'::uuid) 
    $$,
    
    'O trigger deve inserir um novo perfil em public.profiles após um novo usuário ser criado'
);


-- --- Fim dos Testes ---

SELECT * FROM finish();

-- O ROLLBACK desfaz tudo: o usuário em auth.users e o perfil em public.profiles
ROLLBACK;