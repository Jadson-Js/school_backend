import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.7.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// (MUDANÇA 1) Adiciona headers CORS para permitir que seu app chame a função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // (MUDANÇA 2) Responde a requisições OPTIONS (necessário para CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // (MUDANÇA 3) Pega o token de autorização do usuário que fez a requisição
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // (MUDANÇA 4) Cria o cliente Supabase usando a ANON_KEY
    // e o token do usuário.
    // ISSO FAZ O AUTH.UID() FUNCIONAR!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Use a ANON_KEY
      {
        global: {
          headers: { Authorization: authHeader }, // Passa o token do usuário
        },
      }
    )

    // 1. Obter a chave da API da IA
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não foi configurada.')
    }

    // 2. Extrair os dados da requisição
    const {
      topic,
      grade_level,
      subject,
      learning_context,
      duration_minutes
    } = await req.json()

    if (!topic || !grade_level || !subject) {
      return new Response(
        JSON.stringify({ error: "Campos 'topic', 'grade_level', e 'subject' são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Construir o prompt para a IA (seu prompt está ótimo)
    const systemPrompt = `
      Você é um especialista em pedagogia e assistente de criação de planos de aula alinhado à BNCC (Base Nacional Comum Curricular) do Brasil.
      Sua tarefa é gerar um plano de aula detalhado com base nos seguintes parâmetros:
      - Tópico: ${topic}
      - Nível/Ano: ${grade_level}
      - Matéria: ${subject}
      - Contexto de Aprendizagem: ${learning_context || 'Sala de aula padrão'}
      - Duração: ${duration_minutes || 'Não especificada'} minutos

      Sua resposta DEVE ser um objeto JSON válido, sem nenhum texto introdutório, explicação ou formatação markdown (como \`\`\`json).
      O JSON deve ter EXATAMENTE a seguinte estrutura:
      {
        "introducao_ludica": "Uma descrição criativa, engajadora e breve para apresentar o tema aos alunos.",
        "objetivo_bncc": "Um objetivo de aprendizagem específico (incluindo o código da BNCC, se possível, ex: 'EF01CI01') relacionado ao tópico e nível.",
        "passo_a_passo": "Um roteiro detalhado da atividade, dividido em etapas claras e práticas para a professora executar.",
        "rubrica_avaliacao": "Uma lista de 2-3 critérios claros e simples para a professora avaliar o aprendizado dos alunos sobre o tópico."
      }
    `

    // 4. Inicializar o cliente do Google
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash', // Recomendo 'gemini-1.5-flash' se disponível
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    // 5. Chamar a API da IA
    const result = await model.generateContent(systemPrompt)
    const aiResponseText = result.response.text()

    // 6. Salvar tudo no banco de dados
    // Agora o cliente está autenticado como o usuário,
    // então a função 'insert_lesson_plan' receberá o auth.uid()
    const { error: dbError } = await supabaseClient.rpc('insert_lesson_plan', {
      p_topic: topic,
      p_grade_level: grade_level,
      p_subject: subject,
      p_learning_context: learning_context,
      p_duration_minutes: duration_minutes,
      p_generated_content: aiResponseText,
      p_prompt_debug: systemPrompt
    })

    if (dbError) {
      console.error('Erro ao salvar no Supabase:', dbError.message)
      // Agora, se o dbError ocorrer, é um problema real
      // (não apenas um problema de autenticação)
      return new Response(
        JSON.stringify({ error: `Erro ao salvar no banco: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 7. Retornar resposta JSON da IA para o cliente
    return new Response(
      aiResponseText,
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error(error.message)
    if (error instanceof SyntaxError) {
        return new Response(
        JSON.stringify({ error: "Corpo da requisição inválido (não é JSON)." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})