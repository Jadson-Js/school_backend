BEGIN;

-- 1. Setup do pgTAP (como no seu exemplo)
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Vamos rodar 2 testes principais
SELECT plan(2);

-- 2. Setup do Usuário (como no seu exemplo)
-- Inserimos um usuário falso direto na tabela auth.users
INSERT INTO auth.users (id, email) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'testuser@example.com');

-- 3. Setup do Contexto de Autenticação (A PARTE MAIS IMPORTANTE)
-- Definimos o 'role' da sessão atual para 'authenticated'
SET LOCAL ROLE authenticated;
-- Definimos o 'claim' do JWT, que é o que preenche auth.uid()
SET LOCAL request.jwt.claim.sub = '123e4567-e89b-12d3-a456-426614174000';

-- --- Início dos Testes ---

-- Teste 1: Verificar se a função retorna o 'topic' correto
-- Esta é a chamada que estava falhando por causa do user_id nulo.
-- Agora auth.uid() terá um valor.
SELECT is(
    (SELECT topic FROM insert_lesson_plan(
        'Teste de Tópico'::TEXT,             -- p_topic
        '3º Ano'::TEXT,                      -- p_grade_level
        'Ciências'::TEXT,                    -- p_subject
        'Laboratório'::TEXT,                 -- p_learning_context
        30::SMALLINT,                        -- p_duration_minutes
        '{"objetivo": "testar"}'::jsonb,     -- p_generated_content
        'prompt de teste'::TEXT              -- p_prompt_debug
    )),
    'Teste de Tópico',
    'Teste 1: A função insert_lesson_plan() deve retornar a linha inserida'
);

-- Teste 2: Verificar se os dados foram salvos corretamente na tabela
-- Usando results_eq, como no seu exemplo, para checar a linha inteira.
SELECT results_eq(
    -- Query 1: O que realmente está no banco
    $$ 
        SELECT user_id, subject, generated_content->>'objetivo' 
        FROM public.lesson_plans 
        WHERE topic = 'Teste de Tópico' 
    $$,
    -- Query 2: O que esperamos que esteja lá
    $$ 
        VALUES (
            '123e4567-e89b-12d3-a456-426614174000'::uuid, 
            'Ciências'::text, 
            'testar'::text
        ) 
    $$,
    'Teste 2: A linha em lesson_plans deve ter o user_id, subject e json corretos'
);

-- --- Fim dos Testes ---

SELECT * FROM finish();

-- O ROLLBACK desfaz tudo: o usuário inserido e o plano de aula.
ROLLBACK;