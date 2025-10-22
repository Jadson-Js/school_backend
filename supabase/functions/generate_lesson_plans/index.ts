//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from "../shared/createSupabaseClient.ts"
import { LessonPlanRequest, LessonPlanResponse } from '../shared/types.ts'
import { jsonResponse } from '../shared/jsonResponse.ts'
import { Prompt } from './Prompt.ts'
import { CORS_HEADERS } from '../shared/consts.ts'

function validateRequest(data: Partial<LessonPlanRequest>): string | null {
  if (!data.topic) return "Field 'topic' is required."
  if (!data.grade_level) return "Field 'grade_level' is required."
  if (!data.subject) return "Field 'subject' is required."
  if (data.duration_minutes && parseInt(data.duration_minutes) < 15) return "Duration must be greater than 15 minutes."

  return null
}

async function saveLessonPlan(
  supabaseClient: ReturnType<typeof createSupabaseClient>,
  params: LessonPlanRequest,
  generatedContent: string,
  promptDebug: string
) {
  const { data, error } = await supabaseClient.rpc('insert_lesson_plan', {
    p_topic: params.topic,
    p_grade_level: params.grade_level,
    p_subject: params.subject,
    p_learning_context: params.learning_context || null,
    p_duration_minutes: params.duration_minutes || null,
    p_generated_content: generatedContent,
    p_prompt_debug: promptDebug,
  })

  if (error) {
    throw new Error(`Error saving to database: ${error.message}`)
  }

  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw jsonResponse({ error: 'User not authenticated.' }, 401)
    }

    //@ts-ignore
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY not configured.' }, 500)
    }

    const requestData: Partial<LessonPlanRequest> = await req.json()
    
    const validationError = validateRequest(requestData)
    if (validationError) {
      return jsonResponse({ error: validationError }, 400)
    }

    const params = requestData as LessonPlanRequest

    const supabaseClient = createSupabaseClient(authHeader)

    const aiResponse = await Prompt.execute(params, geminiApiKey)

    const parsedContent = Prompt.parseAIResponse(aiResponse.response)

    const savedData = await saveLessonPlan(
      supabaseClient,
      params,
      aiResponse.response,
      aiResponse.prompt
    )

    return jsonResponse({
      success: true,
      lesson_plan_id: savedData,
      content: parsedContent,
    })

  } catch (error) {
    console.error('Function error:', error)

    if (error instanceof SyntaxError) {
      return jsonResponse(
        { error: 'Invalid request body (not JSON).' },
        400
      )
    }

    return jsonResponse(
      { 
        error: error.message || 'Internal server error',
        //@ts-ignore
        details: Deno.env.get('ENVIRONMENT') === 'development' ? error.stack : undefined
      },
      500
    )
  }
})
