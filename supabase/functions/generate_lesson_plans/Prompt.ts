import { LessonPlanRequest, LessonPlanResponse } from "../shared/types.ts"
// @ts-ignore
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.7.0'

export class Prompt {
  private constructor(
    private readonly params: LessonPlanRequest,
    private readonly apiKey: string
  ) {}

  static async execute(params: LessonPlanRequest, apiKey: string) {
    const prompt = new Prompt(params, apiKey)
    const builder = prompt.buildPrompt()
    const response = await prompt.generateLessonPlanWithAI(builder)
    return {response, prompt: builder}
  }

  private buildPrompt(): string {
    const { topic, grade_level, subject, learning_context, duration_minutes } = this.params

    return `Você é um assistente especializado em pedagogia brasileira e criação de planos de aula alinhados à BNCC.

# CONTEXTO DO PLANO DE AULA
Tópico: ${topic}
Nível/Ano: ${grade_level}
Matéria: ${subject}
Contexto: ${learning_context || 'Sala de aula padrão'}
Duração: ${duration_minutes || 50} minutos

# INSTRUÇÕES CRÍTICAS
1. Sua resposta DEVE ser EXCLUSIVAMENTE um objeto JSON válido
2. NÃO inclua texto antes ou depois do JSON
3. NÃO use markdown, code blocks ou explicações
4. NÃO use comentários dentro do JSON
5. TODOS os campos são obrigatórios e não podem estar vazios

# ESTRUTURA OBRIGATÓRIA
Retorne um JSON com esta estrutura EXATA:

{
  "ludic_introduction": "string de 150-300 caracteres descrevendo uma abertura criativa e envolvente da aula usando narrativa, jogo, desafio ou elemento surpresa que conecte com a realidade dos alunos",
  "bncc_goal": "string de 100-200 caracteres citando o código BNCC específico (ex: EF67LP28) e o objetivo de aprendizagem correspondente ao ano e matéria",
  "step_by_step": [
    {
      "etapa": "string com nome da etapa (ex: 'Aquecimento', 'Desenvolvimento', 'Prática')",
      "tempo": "string com tempo em minutos (ex: '10 minutos', '15-20 minutos')",
      "descricao": "string de 100-250 caracteres com descrição clara, acionável e específica do que professor e alunos farão"
    }
  ],
  "rubric_evaluation": {
    "excelente": "string de 80-150 caracteres descrevendo critérios observáveis de desempenho superior",
    "bom": "string de 80-150 caracteres descrevendo critérios observáveis de desempenho adequado",
    "satisfatorio": "string de 80-150 caracteres descrevendo critérios observáveis de desempenho mínimo aceitável",
    "em_desenvolvimento": "string de 80-150 caracteres descrevendo critérios observáveis de desempenho que necessita apoio"
  }
}

# REGRAS DE QUALIDADE PEDAGÓGICA
- ludic_introduction: Use técnicas como storytelling, problematização, jogo mental ou conexão com experiência pessoal dos alunos
- bncc_goal: Cite código BNCC real e válido para o ano/série e matéria especificados
- step_by_step: Inclua 4-6 etapas que cubram introdução, desenvolvimento, prática e fechamento. Tempos devem somar aproximadamente a duração total
- rubric_evaluation: Cada nível deve ter critérios OBSERVÁVEIS e MENSURÁVEIS, não apenas adjetivos genéricos

# EXEMPLO DE RESPOSTA VÁLIDA
Para referência de formato e qualidade, veja este exemplo:

{
  "ludic_introduction": "Imagine que vocês são detetives científicos! Hoje investigaremos um mistério: por que alguns objetos flutuam na água e outros afundam? Cada grupo receberá uma 'caixa de evidências' com objetos misteriosos.",
  "bncc_goal": "(EF03CI01) Produzir diferentes sons a partir da vibração de variados objetos e identificar variáveis que influenciam esse fenômeno",
  "step_by_step": [
    {
      "etapa": "Engajamento Inicial",
      "tempo": "8 minutos",
      "descricao": "Apresentar a caixa de evidências, permitir manipulação livre dos objetos e coletar hipóteses iniciais dos alunos no quadro"
    },
    {
      "etapa": "Experimentação Guiada",
      "tempo": "20 minutos",
      "descricao": "Em grupos, testar cada objeto na água, registrar resultados em tabela e discutir padrões observados"
    },
    {
      "etapa": "Sistematização",
      "tempo": "12 minutos",
      "descricao": "Consolidar descobertas coletivamente, introduzir conceito de densidade de forma acessível e conectar com exemplos do cotidiano"
    },
    {
      "etapa": "Aplicação",
      "tempo": "10 minutos",
      "descricao": "Desafio final: prever se novos objetos flutuarão ou afundarão e justificar as previsões usando o conceito aprendido"
    }
  ],
  "rubric_evaluation": {
    "excelente": "Prevê corretamente e justifica usando densidade, faz conexões com situações cotidianas e propõe novas investigações",
    "bom": "Prevê corretamente a maioria dos casos, explica usando características dos objetos e participa das discussões",
    "satisfatorio": "Consegue fazer previsões básicas, identifica que alguns objetos flutuam e outros não com apoio do grupo",
    "em_desenvolvimento": "Ainda não consegue fazer previsões consistentes, precisa de orientação direta para observar padrões"
  }
}

# VALIDAÇÃO ANTES DE RESPONDER
Antes de gerar sua resposta, verifique:
✓ É um JSON válido que pode ser parseado?
✓ Todos os 4 campos principais estão presentes?
✓ step_by_step tem pelo menos 3 etapas?
✓ Cada etapa tem os 3 subcampos?
✓ rubric_evaluation tem os 4 níveis?
✓ Não há texto fora do JSON?

IMPORTANTE: Responda APENAS com o JSON. Comece sua resposta com { e termine com }`.trim()
  }

  private async generateLessonPlanWithAI(prompt: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      // @ts-ignore
      generationConfig: { 
        responseMimeType: 'application/json',
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
    })

    const result = await model.generateContent(prompt)
    return result.response.text()
  }

  static parseAIResponse(aiResponse: string): LessonPlanResponse {
    try {
      const cleaned = aiResponse
        .replace(/^```json?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim()
      
      const parsed = JSON.parse(cleaned)
      
      if (!parsed.ludic_introduction || typeof parsed.ludic_introduction !== 'string') {
        throw new Error('Campo ludic_introduction ausente ou inválido')
      }
      
      if (!parsed.bncc_goal || typeof parsed.bncc_goal !== 'string') {
        throw new Error('Campo bncc_goal ausente ou inválido')
      }
      
      if (!Array.isArray(parsed.step_by_step) || parsed.step_by_step.length < 3) {
        throw new Error('Campo step_by_step deve ser um array com pelo menos 3 etapas')
      }
      
      parsed.step_by_step.forEach((step: any, index: number) => {
        if (!step.etapa || !step.tempo || !step.descricao) {
          throw new Error(`Etapa ${index + 1} está incompleta`)
        }
      })
      
      if (!parsed.rubric_evaluation || typeof parsed.rubric_evaluation !== 'object') {
        throw new Error('Campo rubric_evaluation ausente ou inválido')
      }
      
      const rubricLevels = ['excelente', 'bom', 'satisfatorio', 'em_desenvolvimento']
      rubricLevels.forEach(level => {
        if (!parsed.rubric_evaluation[level] || typeof parsed.rubric_evaluation[level] !== 'string') {
          throw new Error(`Nível de avaliação '${level}' ausente ou inválido`)
        }
      })
      
      return parsed as LessonPlanResponse
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Resposta da IA:', aiResponse)
      throw new Error(`Erro ao processar resposta da IA: ${errorMessage}`)
    }
  }
}