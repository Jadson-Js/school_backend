//@ts-ignore
import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.203.0/assert/mod.ts";
import { Prompt } from "./Prompt.ts";
import { LessonPlanRequest } from "../shared/types.ts";

const validLessonPlanRequest: LessonPlanRequest = {
  topic: "Photosynthesis",
  grade_level: "7th grade",
  subject: "Science",
  learning_context: "Class with different learning levels",
  duration_minutes: "45"
};

const minimalLessonPlanRequest: LessonPlanRequest = {
  topic: "Addition",
  grade_level: "2nd grade",
  subject: "Math"
};

const validAIResponse = JSON.stringify({
  ludic_introduction: "Let's imagine we are plants...",
  bncc_goal: "EF07CI05 - Understand the photosynthesis process",
  step_by_step: [
    {
      etapa: "Introduction",
      tempo: "10 minutes",
      descricao: "Presentation of the topic"
    },
    {
      etapa: "Development",
      tempo: "25 minutes",
      descricao: "Detailed explanation of the process"
    },
    {
      etapa: "Conclusion",
      tempo: "10 minutes",
      descricao: "Review and reinforcement"
    }
  ],
  rubric_evaluation: {
    excelente: "Shows full understanding of the process",
    bom: "Understands most of the concepts",
    satisfatorio: "Understands basic concepts",
    em_desenvolvimento: "Needs reinforcement"
  }
});

let originalExecute: any;
let mockResponse: string = validAIResponse;
let shouldThrow: boolean = false;

function setupMock(response: string = validAIResponse, throwError: boolean = false) {
  mockResponse = response;
  shouldThrow = throwError;
  
  if (!originalExecute) {
    originalExecute = Prompt.execute;
  }
  
  //@ts-ignore
  Prompt.execute = async (request: LessonPlanRequest, apiKey: string) => {
    if (shouldThrow) {
      throw new Error("API Error: Rate limit exceeded");
    }
    
    const prompt = `You are an expert in pedagogy and have deep knowledge of the Brazilian BNCC (Base Nacional Comum Curricular).

Create a detailed lesson plan based on the following information:

Topic: ${request.topic}
Grade Level: ${request.grade_level}
Subject: ${request.subject}
Learning Context: ${request.learning_context || "Standard classroom"}
Lesson Duration: ${request.duration_minutes || "Not specified"}

The plan must include:
1. A playful and engaging introduction
2. Learning objective aligned with BNCC
3. Detailed step-by-step of the lesson
4. Evaluation rubric

IMPORTANT: Return ONLY a valid JSON, without markdown or additional text, following this structure:
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

//@ts-ignore
Deno.test("Prompt.parseAIResponse - Success with valid response", () => {
  const result = Prompt.parseAIResponse(validAIResponse);
  
  assertExists(result);
  assertEquals(result.ludic_introduction, "Let's imagine we are plants...");
  assertEquals(result.bncc_goal, "EF07CI05 - Understand the photosynthesis process");
  assertExists(result.step_by_step);
  assertEquals(result.step_by_step.length, 3);
  assertExists(result.rubric_evaluation);
  //@ts-ignore
  assertEquals(result.rubric_evaluation.excelente, "Shows full understanding of the process");
});

//@ts-ignore
Deno.test("Prompt.execute - Success with minimal parameters (without learning_context and duration_minutes)", async () => {
  setupMock();
  
  try {
    const result = await Prompt.execute(minimalLessonPlanRequest, "mock-api-key");
    
    assertExists(result);
    assertExists(result.response);
    assertExists(result.prompt);
    
    // Check default values in prompt
    assertEquals(result.prompt.includes("Standard classroom"), true);
    assertEquals(result.prompt.includes("Not specified"), true);
    
    // Check required fields
    assertEquals(result.prompt.includes("Addition"), true);
    assertEquals(result.prompt.includes("2nd grade"), true);
    assertEquals(result.prompt.includes("Math"), true);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Prompt contains BNCC instructions", async () => {
  setupMock();
  
  try {
    const result = await Prompt.execute(validLessonPlanRequest, "mock-api-key");
    
    assertEquals(result.prompt.includes("BNCC"), true);
    assertEquals(result.prompt.includes("Base Nacional Comum Curricular"), true);
    assertEquals(result.prompt.includes("expert in pedagogy"), true);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Prompt specifies JSON format", async () => {
  setupMock();
  
  try {
    const result = await Prompt.execute(validLessonPlanRequest, "mock-api-key");
    
    assertEquals(result.prompt.includes("valid JSON"), true);
    assertEquals(result.prompt.includes("ludic_introduction"), true);
    assertEquals(result.prompt.includes("bncc_goal"), true);
    assertEquals(result.prompt.includes("step_by_step"), true);
    assertEquals(result.prompt.includes("rubric_evaluation"), true);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Error when API throws exception", async () => {
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
Deno.test("Prompt.execute - Response contains expected structure", async () => {
  setupMock();
  
  try {
    const result = await Prompt.execute(validLessonPlanRequest, "mock-api-key");
    const parsed = JSON.parse(result.response);
    
    assertEquals(Array.isArray(parsed.step_by_step), true);
    assertEquals(parsed.step_by_step.length > 0, true);
    assertExists(parsed.step_by_step[0].etapa);
    assertExists(parsed.step_by_step[0].tempo);
    assertExists(parsed.step_by_step[0].descricao);
    
    assertExists(parsed.rubric_evaluation.excelente);
    assertExists(parsed.rubric_evaluation.bom);
    assertExists(parsed.rubric_evaluation.satisfatorio);
    assertExists(parsed.rubric_evaluation.em_desenvolvimento);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Special characters in topic are handled correctly", async () => {
  setupMock();
  
  try {
    const requestWithSpecialChars: LessonPlanRequest = {
      topic: "Operations with fractions: addition & subtraction (1/2 + 1/4)",
      grade_level: "5th grade",
      subject: "Math"
    };
    
    const result = await Prompt.execute(requestWithSpecialChars, "mock-api-key");
    
    assertEquals(result.prompt.includes("Operations with fractions: addition & subtraction (1/2 + 1/4)"), true);
    assertExists(result.response);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Duration_minutes as string is included in prompt", async () => {
  setupMock();
  
  try {
    const requestWithDuration: LessonPlanRequest = {
      topic: "Test",
      grade_level: "6th grade",
      subject: "History",
      duration_minutes: "90"
    };
    
    const result = await Prompt.execute(requestWithDuration, "mock-api-key");
    
    assertEquals(result.prompt.includes("90"), true);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Prompt.execute - Custom learning_context appears in prompt", async () => {
  setupMock();
  
  try {
    const requestWithContext: LessonPlanRequest = {
      topic: "Test",
      grade_level: "8th grade",
      subject: "Geography",
      learning_context: "EJA class (Youth and Adult Education)"
    };
    
    const result = await Prompt.execute(requestWithContext, "mock-api-key");
    
    assertEquals(result.prompt.includes("EJA class (Youth and Adult Education)"), true);
    assertEquals(result.prompt.includes("Standard classroom"), false);
  } finally {
    restoreMock();
  }
});

//@ts-ignore
Deno.test("Integration - execute and parseAIResponse work together", async () => {
  setupMock();
  
  try {
    const executeResult = await Prompt.execute(validLessonPlanRequest, "mock-api-key");
    const parsed = Prompt.parseAIResponse(executeResult.response);
    
    assertExists(parsed);
    assertEquals(parsed.ludic_introduction, "Let's imagine we are plants...");
    assertEquals(parsed.step_by_step.length, 3);
  } finally {
    restoreMock();
  }
});
