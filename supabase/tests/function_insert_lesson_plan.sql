BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(2);

INSERT INTO auth.users (id, email) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'testuser@example.com');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '123e4567-e89b-12d3-a456-426614174000';

SELECT is(
    (SELECT topic FROM insert_lesson_plan(
        'Test Topic'::TEXT,             
        '3rd Grade'::TEXT,                    
        'Science'::TEXT,                   
        'Laboratory'::TEXT,                 
        30::SMALLINT,                    
        '{"objective": "test"}'::jsonb, 
        'test prompt'::TEXT            
    )),
    'Test Topic',
    'Test 1: The insert_lesson_plan() function should return the inserted row'
);

SELECT results_eq(
    $$ 
        SELECT user_id, subject, generated_content->>'objective' 
        FROM public.lesson_plans 
        WHERE topic = 'Test Topic' 
    $$,
    $$ 
        VALUES (
            '123e4567-e89b-12d3-a456-426614174000'::uuid, 
            'Science'::text, 
            'test'::text
        ) 
    $$,
    'Test 2: The row in lesson_plans should have the correct user_id, subject, and JSON content'
);

SELECT * FROM finish();

ROLLBACK;
