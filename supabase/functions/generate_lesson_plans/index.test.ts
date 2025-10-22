//@ts-ignore
import { assertEquals, assertExists } from "https://deno.land/std@0.203.0/assert/mod.ts";

// Mock do módulo Prompt (sem usar stub em objetos vazios)
const createMockPrompt = () => ({
  execute: async (params: any, apiKey: string) => ({
    response: JSON.stringify({
      title: "Plano de Aula: Matemática Básica",
      objectives: ["Objetivo 1", "Objetivo 2"],
      activities: [
        { name: "Atividade 1", duration: "20min", description: "Descrição" }
      ]
    }),
    prompt: "Prompt de teste gerado"
  }),
  parseAIResponse: (response: string) => JSON.parse(response)
});

// Mock da função de criação do cliente Supabase
const createMockSupabaseClient = (
  rpcResponse: { data: unknown; error: unknown }
) => ({
  rpc: async (functionName: string, params: any) => rpcResponse
});

// Mock do Request
const mockRequest = (
  body: unknown,
  authHeader: string | null = "Bearer mock-token"
): Request => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  
  return new Request("http://localhost/lesson-plan", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
};

// Mock para OPTIONS (CORS preflight)
const mockOptionsRequest = (): Request => {
  return new Request("http://localhost/lesson-plan", {
    method: "OPTIONS",
  });
};

// Função auxiliar para simular o handler
const mockHandler = async (
  req: Request,
  supabaseClient: any,
  promptModule: any,
  geminiApiKey: string
) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Usuário não autenticado." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY não configurada." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let requestData;
  try {
    requestData = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Corpo da requisição inválido (não é JSON)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validação
  if (!requestData.topic) {
    return new Response(
      JSON.stringify({ error: "Campo 'topic' é obrigatório." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!requestData.grade_level) {
    return new Response(
      JSON.stringify({ error: "Campo 'grade_level' é obrigatório." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!requestData.subject) {
    return new Response(
      JSON.stringify({ error: "Campo 'subject' é obrigatório." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (requestData.duration_minutes && parseInt(requestData.duration_minutes) < 15) {
    return new Response(
      JSON.stringify({ error: "Duração em minuto maior que 15" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Chama a IA
    const aiResponse = await promptModule.execute(requestData, geminiApiKey);
    const parsedContent = promptModule.parseAIResponse(aiResponse.response);

    // Salva no banco
    const { data, error } = await supabaseClient.rpc("insert_lesson_plan", {
      p_topic: requestData.topic,
      p_grade_level: requestData.grade_level,
      p_subject: requestData.subject,
      p_learning_context: requestData.learning_context || null,
      p_duration_minutes: requestData.duration_minutes || null,
      p_generated_content: aiResponse.response,
      p_prompt_debug: aiResponse.prompt,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: `Erro ao salvar no banco: ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        lesson_plan_id: data,
        content: parsedContent,
        metadata: {
          topic: requestData.topic,
          grade_level: requestData.grade_level,
          subject: requestData.subject,
          learning_context: requestData.learning_context,
          duration_minutes: requestData.duration_minutes,
          created_at: new Date().toISOString()
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// ============================================
// TESTES
// ============================================

//@ts-ignore
Deno.test("Handler - CORS preflight (OPTIONS)", async () => {
  const req = mockOptionsRequest();
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  
  assertEquals(res.status, 200);
});

//@ts-ignore
Deno.test("Handler - Success (200) - Plano de aula criado com sucesso", async () => {
  const body = {
    topic: "Adição e Subtração",
    grade_level: "3º ano",
    subject: "Matemática",
    duration_minutes: "45"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({
    data: "lesson-plan-uuid-123",
    error: null,
  });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 200);
  assertEquals(json.success, true);
  assertEquals(json.lesson_plan_id, "lesson-plan-uuid-123");
  assertExists(json.content);
  assertExists(json.metadata);
  assertEquals(json.metadata.topic, "Adição e Subtração");
  assertEquals(json.metadata.grade_level, "3º ano");
});

//@ts-ignore
Deno.test("Handler - Success com learning_context opcional", async () => {
  const body = {
    topic: "Fotossíntese",
    grade_level: "7º ano",
    subject: "Ciências",
    learning_context: "Turma com alunos de diferentes níveis",
    duration_minutes: "60"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({
    data: "lesson-plan-uuid-456",
    error: null,
  });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 200);
  assertEquals(json.metadata.learning_context, "Turma com alunos de diferentes níveis");
});

//@ts-ignore
Deno.test("Handler - Error 401 - Sem autenticação", async () => {
  const body = {
    topic: "Teste",
    grade_level: "5º ano",
    subject: "História"
  };
  
  const req = mockRequest(body, null); // Sem Authorization header
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 401);
  assertEquals(json.error, "Usuário não autenticado.");
});

//@ts-ignore
Deno.test("Handler - Error 400 - Campo 'topic' ausente", async () => {
  const body = {
    grade_level: "5º ano",
    subject: "História"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Campo 'topic' é obrigatório.");
});

//@ts-ignore
Deno.test("Handler - Error 400 - Campo 'grade_level' ausente", async () => {
  const body = {
    topic: "Teste",
    subject: "História"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Campo 'grade_level' é obrigatório.");
});

//@ts-ignore
Deno.test("Handler - Error 400 - Campo 'subject' ausente", async () => {
  const body = {
    topic: "Teste",
    grade_level: "5º ano"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Campo 'subject' é obrigatório.");
});

//@ts-ignore
Deno.test("Handler - Error 400 - duration_minutes menor que 15", async () => {
  const body = {
    topic: "Teste",
    grade_level: "5º ano",
    subject: "História",
    duration_minutes: "10"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Duração em minuto maior que 15");
});

//@ts-ignore
Deno.test("Handler - Error 500 - GEMINI_API_KEY não configurada", async () => {
  const body = {
    topic: "Teste",
    grade_level: "5º ano",
    subject: "História"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, ""); // API key vazia
  const json = await res.json();
  
  assertEquals(res.status, 500);
  assertEquals(json.error, "GEMINI_API_KEY não configurada.");
});

//@ts-ignore
Deno.test("Handler - Error 500 - Erro ao salvar no banco", async () => {
  const body = {
    topic: "Teste",
    grade_level: "5º ano",
    subject: "História"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({
    data: null,
    error: { message: "Database connection failed" },
  });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 500);
  assertEquals(json.error, "Erro ao salvar no banco: Database connection failed");
});

//@ts-ignore
Deno.test("Handler - Error 400 - JSON inválido", async () => {
  const req = new Request("http://localhost/lesson-plan", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token"
    },
    body: "{ invalid json }"
  });
  
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Corpo da requisição inválido (não é JSON).");
});

//@ts-ignore
Deno.test("Handler - Validação de todos os campos obrigatórios presentes", async () => {
  const body = {
    topic: "Revolução Francesa",
    grade_level: "9º ano",
    subject: "História",
    learning_context: "Turma avançada",
    duration_minutes: "90"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({
    data: "lesson-plan-complete",
    error: null,
  });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 200);
  assertEquals(json.success, true);
  assertEquals(json.lesson_plan_id, "lesson-plan-complete");
  assertEquals(json.metadata.duration_minutes, "90");
});

//@ts-ignore
Deno.test("Handler - duration_minutes exatamente 15 (limite válido)", async () => {
  const body = {
    topic: "Teste Limites",
    grade_level: "5º ano",
    subject: "Matemática",
    duration_minutes: "15"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({
    data: "lesson-plan-limit",
    error: null,
  });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 200);
  assertEquals(json.success, true);
});