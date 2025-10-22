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

    return `
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
  "ludic_introduction": "...",
  "bncc_goal": "...",
  "step_by_step": [{etapa: "...", tempo: "...", descricao: "..."}],
  "rubric_evaluation": { excelente: "...", bom: "...", satisfatorio: "...", em_desenvolvimento: "..."}
}
`.trim()
  }

  private async generateLessonPlanWithAI(prompt: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      // @ts-ignore - responseMimeType existe mas não está na tipagem da versão 0.7.0
      generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await model.generateContent(prompt)
    return result.response.text()
  }

  static parseAIResponse(aiResponse: string): LessonPlanResponse {
    try {
      const parsed = JSON.parse(aiResponse)
      
      // Valida se tem os campos esperados
      if (!parsed.ludic_introduction || !parsed.bncc_goal || 
          !parsed.step_by_step || !parsed.rubric_evaluation) {
        throw new Error('Resposta da IA não contém todos os campos necessários')
      }
      
      return parsed as LessonPlanResponse
    } catch (error) {
      // Corrigido: Type assertion para error
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      throw new Error(`Erro ao processar resposta da IA: ${errorMessage}`)
    }
  }
}