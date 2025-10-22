BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(1);

INSERT INTO auth.users (id, email) 
VALUES ('a0000000-0000-0000-0000-000000000001', 'test_trigger@example.com');

SELECT results_eq(
    $$ 
        SELECT user_id 
        FROM public.profiles 
        WHERE user_id = 'a0000000-0000-0000-0000-000000000001' 
    $$,
    
    $$ 
        VALUES ('a0000000-0000-0000-0000-000000000001'::uuid) 
    $$,
    
    'The trigger should insert a new profile into public.profiles after a new user is created'
);



SELECT * FROM finish();

ROLLBACK;