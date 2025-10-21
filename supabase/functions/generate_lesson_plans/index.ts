//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {createSupabaseClient} from "../shared/createSupabaseClient.ts"
import { LessonPlanRequest, LessonPlanResponse } from '../shared/types.ts'
import { jsonResponse } from '../shared/jsonResponse.ts'
import { Prompt } from './Prompt.ts'
import { CORS_HEADERS } from '../shared/consts.ts'

// ============================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================








/**
 * Valida os campos obrigatórios da requisição
 */
function validateRequest(data: Partial<LessonPlanRequest>): string | null {
  if (!data.topic) return "Campo 'topic' é obrigatório."
  if (!data.grade_level) return "Campo 'grade_level' é obrigatório."
  if (!data.subject) return "Campo 'subject' é obrigatório."

  return null
}




/**
 * Salva o plano de aula no banco de dados
 */
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
    throw new Error(`Erro ao salvar no banco: ${error.message}`)
  }

  return data
}

/**
 * Parse seguro do JSON retornado pela IA
 */


// ============================================
// HANDLER PRINCIPAL
// ============================================
serve(async (req) => {
  // Trata requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // 1. Valida autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw jsonResponse({ error: 'Usuário não autenticado.' }, 401)
    }

    // 2. Valida chave da API da IA
    //@ts-ignore
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY não configurada.' }, 500)
    }

    // 3. Parse e valida o corpo da requisição
    const requestData: Partial<LessonPlanRequest> = await req.json()
    
    const validationError = validateRequest(requestData)
    if (validationError) {
      return jsonResponse({ error: validationError }, 400)
    }

    const params = requestData as LessonPlanRequest

    // 4. Cria cliente Supabase autenticado
    const supabaseClient = createSupabaseClient(authHeader)

    // 5. Gera o prompt e chama a IA
    const aiResponse = await Prompt.execute(params, geminiApiKey)

    // 6. Parse o JSON retornado pela IA
    const parsedContent = Prompt.parseAIResponse(aiResponse.response)

    // 7. Salva no banco de dados
    const savedData = await saveLessonPlan(
      supabaseClient,
      params,
      aiResponse.response, // Salva o JSON string no banco
      aiResponse.prompt
    )

    // 8. Retorna o JSON parseado + dados do banco
    return jsonResponse({
      success: true,
      lesson_plan_id: savedData,
      content: parsedContent, // Retorna o objeto parseado
      metadata: {
        topic: params.topic,
        grade_level: params.grade_level,
        subject: params.subject,
        learning_context: params.learning_context,
        duration_minutes: params.duration_minutes,
        created_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Erro na função:', error)

    // Trata erros de JSON inválido
    if (error instanceof SyntaxError) {
      return jsonResponse(
        { error: 'Corpo da requisição inválido (não é JSON).' },
        400
      )
    }

    // Trata outros erros
    return jsonResponse(
      { 
        error: error.message || 'Erro interno do servidor',
        //@ts-ignore
        details: Deno.env.get('ENVIRONMENT') === 'development' ? error.stack : undefined
      },
      500
    )
  }
})