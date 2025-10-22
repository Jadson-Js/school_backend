//@ts-ignore
import { assertEquals, assertExists } from "https://deno.land/std@0.203.0/assert/mod.ts";

const createMockPrompt = () => ({
  execute: async (params: any, apiKey: string) => ({
    response: JSON.stringify({
      title: "Lesson Plan: Basic Math",
      objectives: ["Objective 1", "Objective 2"],
      activities: [
        { name: "Activity 1", duration: "20min", description: "Description" }
      ]
    }),
    prompt: "Generated test prompt"
  }),
  parseAIResponse: (response: string) => JSON.parse(response)
});

const createMockSupabaseClient = (
  rpcResponse: { data: unknown; error: unknown }
) => ({
  rpc: async (functionName: string, params: any) => rpcResponse
});

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

const mockOptionsRequest = (): Request => {
  return new Request("http://localhost/lesson-plan", {
    method: "OPTIONS",
  });
};

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
      JSON.stringify({ error: "User not authenticated." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let requestData;
  try {
    requestData = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid request body (not JSON)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!requestData.topic) {
    return new Response(
      JSON.stringify({ error: "Field 'topic' is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!requestData.grade_level) {
    return new Response(
      JSON.stringify({ error: "Field 'grade_level' is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!requestData.subject) {
    return new Response(
      JSON.stringify({ error: "Field 'subject' is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (requestData.duration_minutes && parseInt(requestData.duration_minutes) < 15) {
    return new Response(
      JSON.stringify({ error: "Duration in minutes must be greater than 15." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const aiResponse = await promptModule.execute(requestData, geminiApiKey);
    const parsedContent = promptModule.parseAIResponse(aiResponse.response);

    // Save to database
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
        JSON.stringify({ error: `Error saving to database: ${error.message}` }),
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
      JSON.stringify({ error: error.message || "Internal server error." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

//@ts-ignore
Deno.test("Handler - CORS preflight (OPTIONS)", async () => {
  const req = mockOptionsRequest();
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  
  assertEquals(res.status, 200);
});

//@ts-ignore
Deno.test("Handler - Success (200) - Lesson plan successfully created", async () => {
  const body = {
    topic: "Addition and Subtraction",
    grade_level: "3rd grade",
    subject: "Math",
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
  assertEquals(json.metadata.topic, "Addition and Subtraction");
  assertEquals(json.metadata.grade_level, "3rd grade");
});

//@ts-ignore
Deno.test("Handler - Success with optional learning_context", async () => {
  const body = {
    topic: "Photosynthesis",
    grade_level: "7th grade",
    subject: "Science",
    learning_context: "Class with students of varying levels",
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
  assertEquals(json.metadata.learning_context, "Class with students of varying levels");
});

//@ts-ignore
Deno.test("Handler - Error 401 - No authentication", async () => {
  const body = {
    topic: "Test",
    grade_level: "5th grade",
    subject: "History"
  };
  
  const req = mockRequest(body, null);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 401);
  assertEquals(json.error, "User not authenticated.");
});

//@ts-ignore
Deno.test("Handler - Error 400 - Missing 'topic' field", async () => {
  const body = {
    grade_level: "5th grade",
    subject: "History"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Field 'topic' is required.");
});

//@ts-ignore
Deno.test("Handler - Error 400 - Missing 'grade_level' field", async () => {
  const body = {
    topic: "Test",
    subject: "History"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Field 'grade_level' is required.");
});

//@ts-ignore
Deno.test("Handler - Error 400 - Missing 'subject' field", async () => {
  const body = {
    topic: "Test",
    grade_level: "5th grade"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Field 'subject' is required.");
});

//@ts-ignore
Deno.test("Handler - Error 400 - duration_minutes less than 15", async () => {
  const body = {
    topic: "Test",
    grade_level: "5th grade",
    subject: "History",
    duration_minutes: "10"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "mock-api-key");
  const json = await res.json();
  
  assertEquals(res.status, 400);
  assertEquals(json.error, "Duration in minutes must be greater than 15.");
});

//@ts-ignore
Deno.test("Handler - Error 500 - GEMINI_API_KEY not configured", async () => {
  const body = {
    topic: "Test",
    grade_level: "5th grade",
    subject: "History"
  };
  
  const req = mockRequest(body);
  const client = createMockSupabaseClient({ data: null, error: null });
  const prompt = createMockPrompt();
  
  const res = await mockHandler(req, client, prompt, "");
  const json = await res.json();
  
  assertEquals(res.status, 500);
  assertEquals(json.error, "GEMINI_API_KEY not configured.");
});

//@ts-ignore
Deno.test("Handler - Error 500 - Database save error", async () => {
  const body = {
    topic: "Test",
    grade_level: "5th grade",
    subject: "History"
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
  assertEquals(json.error, "Error saving to database: Database connection failed");
});

//@ts-ignore
Deno.test("Handler - Error 400 - Invalid JSON", async () => {
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
  assertEquals(json.error, "Invalid request body (not JSON).");
});

//@ts-ignore
Deno.test("Handler - Validation with all required fields present", async () => {
  const body = {
    topic: "French Revolution",
    grade_level: "9th grade",
    subject: "History",
    learning_context: "Advanced class",
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
Deno.test("Handler - duration_minutes exactly 15 (valid limit)", async () => {
  const body = {
    topic: "Limit Test",
    grade_level: "5th grade",
    subject: "Math",
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
