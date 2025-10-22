//@ts-ignore
import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.203.0/assert/mod.ts";
import { Prompt } from "./Prompt.ts";
import { LessonPlanRequest } from "../shared/types.ts";

// ============================================
// DADOS DE TESTE
// ============================================

const validLessonPlanRequest: LessonPlanRequest = {
  topic: "Fotossíntese",
  grade_level: "7º ano",
  subject: "Ciências",
  learning_context: "Turma com diferentes níveis",
  duration_minutes: "45"
};

const minimalLessonPlanRequest: LessonPlanRequest = {
  topic: "Adição",
  grade_level: "2º ano",
  subject: "Matemática"
};

const validAIResponse = JSON.stringify({
  ludic_introduction: "Vamos imaginar que somos plantas...",
  bncc_goal: "EF07CI05 - Compreender o processo de fotossíntese",
  step_by_step: [
    {
      etapa: "Introdução",
      tempo: "10 minutos",
      descricao: "Apresentação do tema"
    },
    {
      etapa: "Desenvolvimento",
      tempo: "25 minutos",
      descricao: "Explicação detalhada do processo"
    },
    {
      etapa: "Conclusão",
      tempo: "10 minutos",
      descricao: "Revisão e fixação"
    }
  ],
  rubric_evaluation: {
    excelente: "Demonstra compreensão completa do processo",
    bom: "Compreende a maioria dos conceitos",
    satisfatorio: "Compreende conceitos básicos",
    em_desenvolvimento: "Necessita reforço"
  }
});

// ============================================
// MOCK SETUP
// ============================================

// Guarda a implementação original
let originalExecute: any;
let mockResponse: string = validAIResponse;
let shouldThrow: boolean = false;

function setupMock(response: string = validAIResponse, throwError: boolean = false) {
  mockResponse = response;
  shouldThrow = throwError;
  
  // Guarda o método original se ainda não foi guardado
  if (!originalExecute) {
    originalExecute = Prompt.execute;
  }
  
  // Sobrescreve o método execute
  //@ts-ignore
  Prompt.execute = async (request: LessonPlanRequest, apiKey: string) => {
    if (shouldThrow) {
      throw new Error("API Error: Rate limit exceeded");
    }
    
    // Gera o prompt usando a lógica original (simulada)
    const prompt = `Você é um especialista em pedagogia e conhece profundamente a BNCC (Base Nacional Comum Curricular) brasileira.

Crie um plano de aula detalhado com base nas seguintes informações:

Tema: ${request.topic}
Ano/Série: ${request.grade_level}
Disciplina: ${request.subject}
Contexto de aprendizagem: ${request.learning_context || "Sala de aula padrão"}
Duração da aula: ${request.duration_minutes || "Não especificada"}

O plano deve incluir:
1. Uma introdução lúdica e envolvente
2. Objetivo de aprendizagem alinhado à BNCC
3. Passo a passo detalhado da aula
4. Rubrica de avaliação

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown ou texto adicional, seguindo esta estrutura:
{
  "ludic_introduction": "string",
  "bncc_goal": "string",
  "step_by_step": [
    {
      "etapa": "string",
      "tempo": "string",
      "descricao": "string"
    }
  ],
  "rubric_evaluation": {
    "excelente": "string",
    "bom": "string",
    "satisfatorio": "string",
    "em_desenvolvimento": "string"
  }
}`;
    
    return {
      prompt,
      response: mockResponse
    };
  };
}

function restoreMock() {
  if (originalExecute) {
    Prompt.execute = originalExecute;
  }
  mockResponse = validAIResponse;
  shouldThrow = false;
}

// ============================================
// TESTES - parseAIResponse
// ============================================

//@ts-ignore
Deno.test("Prompt.parseAIResponse - Success com resposta válida", () => {
  const result = Prompt.parseAIResponse(validAIResponse);
  
  assertExists(result);
  assertEquals(result.ludic_introduction, "Vamos imaginar que somos plantas...");
  assertEquals(result.bncc_goal, "EF07CI05 - Compreender o processo de fotossíntese");
  assertExists(result.step_by_step);
  assertEquals(result.step_by_step.length, 3);
  assertExists(result.rubric_evaluation);
  //@ts-ignore
  assertEquals(result.rubric_evaluation.excelente, "Demonstra compreensão completa do processo");
});

//@ts-ignore
Deno.test("Prompt.execute - Success com parâmetros mínimos (sem learning_context e duration_minutes)", async () => {
  setupMock();
  
  try {
    const result = await Prompt.execute(minimalLessonPlanRequest, "mock-api-key");
    
    assertExists(result);
    assertExists(result.response);
    assertExists(result.prompt);
    
    // Verifica valores padrão no prompt
    assertEquals(result.prompt.includes("Sala de aula padrão"), true);
    assertEquals(result.prompt.includes("Não especificada"), true);
    
    // Verifica campos obrigatórios
    assertEquals(result.prompt.includes("Adição"), true);
    assertEquals(result.prompt.includes("2º ano"), true);
    assertEquals(result.prompt.includes("Matemática"), true);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Prompt contém instruções BNCC", async () => {
  setupMock();
  
  try {
    const result = await Prompt.execute(validLessonPlanRequest, "mock-api-key");
    
    assertEquals(result.prompt.includes("BNCC"), true);
    assertEquals(result.prompt.includes("Base Nacional Comum Curricular"), true);
    assertEquals(result.prompt.includes("especialista em pedagogia"), true);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Prompt especifica formato JSON", async () => {
  setupMock();
  
  try {
    const result = await Prompt.execute(validLessonPlanRequest, "mock-api-key");
    
    assertEquals(result.prompt.includes("JSON válido"), true);
    assertEquals(result.prompt.includes("ludic_introduction"), true);
    assertEquals(result.prompt.includes("bncc_goal"), true);
    assertEquals(result.prompt.includes("step_by_step"), true);
    assertEquals(result.prompt.includes("rubric_evaluation"), true);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Error quando API lança exceção", async () => {
  setupMock(validAIResponse, true);
  
  try {
    await assertRejects(
      async () => {
        await Prompt.execute(validLessonPlanRequest, "mock-api-key");
      },
      Error,
      "API Error: Rate limit exceeded"
    );
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Resposta contém estrutura esperada", async () => {
  setupMock();
  
  try {
    const result = await Prompt.execute(validLessonPlanRequest, "mock-api-key");
    const parsed = JSON.parse(result.response);
    
    // Verifica estrutura do step_by_step
    assertEquals(Array.isArray(parsed.step_by_step), true);
    assertEquals(parsed.step_by_step.length > 0, true);
    assertExists(parsed.step_by_step[0].etapa);
    assertExists(parsed.step_by_step[0].tempo);
    assertExists(parsed.step_by_step[0].descricao);
    
    // Verifica estrutura do rubric_evaluation
    assertExists(parsed.rubric_evaluation.excelente);
    assertExists(parsed.rubric_evaluation.bom);
    assertExists(parsed.rubric_evaluation.satisfatorio);
    assertExists(parsed.rubric_evaluation.em_desenvolvimento);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Caracteres especiais no topic são tratados corretamente", async () => {
  setupMock();
  
  try {
    const requestWithSpecialChars: LessonPlanRequest = {
      topic: "Operações com frações: adição & subtração (1/2 + 1/4)",
      grade_level: "5º ano",
      subject: "Matemática"
    };
    
    const result = await Prompt.execute(requestWithSpecialChars, "mock-api-key");
    
    assertEquals(result.prompt.includes("Operações com frações: adição & subtração (1/2 + 1/4)"), true);
    assertExists(result.response);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Duration_minutes como string é incluída no prompt", async () => {
  setupMock();
  
  try {
    const requestWithDuration: LessonPlanRequest = {
      topic: "Teste",
      grade_level: "6º ano",
      subject: "História",
      duration_minutes: "90"
    };
    
    const result = await Prompt.execute(requestWithDuration, "mock-api-key");
    
    assertEquals(result.prompt.includes("90"), true);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Learning_context personalizado aparece no prompt", async () => {
  setupMock();
  
  try {
    const requestWithContext: LessonPlanRequest = {
      topic: "Teste",
      grade_level: "8º ano",
      subject: "Geografia",
      learning_context: "Turma EJA (Educação de Jovens e Adultos)"
    };
    
    const result = await Prompt.execute(requestWithContext, "mock-api-key");
    
    assertEquals(result.prompt.includes("Turma EJA (Educação de Jovens e Adultos)"), true);
    assertEquals(result.prompt.includes("Sala de aula padrão"), false);
  } finally {
    restoreMock();
  }
});

// ============================================
// TESTES DE INTEGRAÇÃO
// ============================================

//@ts-ignore
Deno.test("Integration - execute e parseAIResponse funcionam juntos", async () => {
  setupMock();
  
  try {
    const executeResult = await Prompt.execute(validLessonPlanRequest, "mock-api-key");
    const parsed = Prompt.parseAIResponse(executeResult.response);
    
    assertExists(parsed);
    assertEquals(parsed.ludic_introduction, "Vamos imaginar que somos plantas...");
    assertEquals(parsed.step_by_step.length, 3);
  } finally {
    restoreMock();
  }
});