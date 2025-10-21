import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.7.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
}

// ============================================
// TIPOS
// ============================================
interface LessonPlanRequest {
  topic: string
  grade_level: string
  subject: string
  learning_context?: string
  duration_minutes?: number
}

interface LessonPlanResponse {
  ludic_introduction: string
  bncc_goal: string
  step_by_step: string
  rubric_evaluation: string
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Cria resposta JSON padronizada
 */
function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: JSON_HEADERS }
  )
}

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
 * Constrói o prompt para a IA
 */
function buildPrompt(params: LessonPlanRequest): string {
  return `
Você é um especialista em pedagogia e assistente de criação de planos de aula alinhado à BNCC (Base Nacional Comum Curricular) do Brasil.
Sua tarefa é gerar um plano de aula detalhado com base nos seguintes parâmetros:

- Tópico: ${params.topic}
- Nível/Ano: ${params.grade_level}
- Matéria: ${params.subject}
- Contexto de Aprendizagem: ${params.learning_context || 'Sala de aula padrão'}
- Duração: ${params.duration_minutes || 'Não especificada'} minutos

Sua resposta DEVE ser um objeto JSON válido, sem nenhum texto introdutório, explicação ou formatação markdown (como \`\`\`json).
O JSON deve ter EXATAMENTE a seguinte estrutura:
{
  "ludic_introduction": "Uma descrição criativa, engajadora e breve para apresentar o tema aos alunos.",
  "bncc_goal": "Um objetivo de aprendizagem específico (incluindo o código da BNCC, se possível, ex: 'EF01CI01') relacionado ao tópico e nível.",
  "step_by_step": "Um roteiro detalhado da atividade, dividido em etapas claras e práticas para a professora executar.",
  "rubric_evaluation": "Uma lista de 2-3 critérios claros e simples para a professora avaliar o aprendizado dos alunos sobre o tópico."
}
`.trim()
}

/**
 * Cria cliente Supabase autenticado
 */
function createAuthenticatedSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não configuradas.')
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  })
}

/**
 * Gera conteúdo usando a IA do Google
 */
async function generateLessonPlanWithAI(
  apiKey: string,
  prompt: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent(prompt)
  return result.response.text()
}

/**
 * Salva o plano de aula no banco de dados
 */
async function saveLessonPlan(
  supabaseClient: ReturnType<typeof createClient>,
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
function parseAIResponse(aiResponse: string): LessonPlanResponse {
  try {
    const parsed = JSON.parse(aiResponse)
    
    // Valida se tem os campos esperados
    if (!parsed.ludic_introduction || !parsed.bncc_goal || 
        !parsed.step_by_step || !parsed.rubric_evaluation) {
      throw new Error('Resposta da IA não contém todos os campos necessários')
    }
    
    return parsed as LessonPlanResponse
  } catch (error) {
    throw new Error(`Erro ao processar resposta da IA: ${error.message}`)
  }
}

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
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401)
    }

    // 2. Valida chave da API da IA
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
    const supabaseClient = createAuthenticatedSupabaseClient(authHeader)

    // 5. Gera o prompt e chama a IA
    const prompt = buildPrompt(params)
    const aiResponse = await generateLessonPlanWithAI(geminiApiKey, prompt)

    // 6. Parse o JSON retornado pela IA
    const parsedContent = parseAIResponse(aiResponse)

    // 7. Salva no banco de dados
    const savedData = await saveLessonPlan(
      supabaseClient,
      params,
      aiResponse, // Salva o JSON string no banco
      prompt
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
        details: Deno.env.get('ENVIRONMENT') === 'development' ? error.stack : undefined
      },
      500
    )
  }
})