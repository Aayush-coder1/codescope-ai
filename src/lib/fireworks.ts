const FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/chat/completions";

// Models verified live on fireworks.ai — fastest first
const MODEL_CHAIN = [
  "accounts/fireworks/models/deepseek-v4-pro",
  "accounts/fireworks/models/glm-5p1",
];

let resolvedModel: string | null = null;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string; reasoning_content?: string } }>;
}

function httpsPost(url: string, headers: Record<string, string>, body: string): Promise<{ status: number; body: string }> {
  const https = require("https");
  const urlObj = new (require("url").URL)(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res: { statusCode: number; on: (event: string, cb: (chunk: Buffer) => void) => void }) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function probeModel(model: string, apiKey: string): Promise<boolean> {
  try {
    const payload = JSON.stringify({ model, messages: [{ role: "user", content: "Say ok" }], max_tokens: 3 });
    const res = await httpsPost(FIREWORKS_API_URL, { Authorization: `Bearer ${apiKey}` }, payload);
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}

async function getWorkingModel(apiKey: string): Promise<string> {
  if (resolvedModel) return resolvedModel;
  for (const model of MODEL_CHAIN) {
    if (await probeModel(model, apiKey)) {
      console.log(`[Fireworks] Using model: ${model}`);
      resolvedModel = model;
      return model;
    }
  }
  throw new Error("No Fireworks models available.");
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) throw new Error("FIREWORKS_API_KEY is not configured");

  const model = options?.model || (await getWorkingModel(apiKey));
  const payload = JSON.stringify({
    model,
    messages,
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature ?? 0.3,
    // KEY FIX: Disable reasoning chain-of-thought for deepseek-v4
    // Default is 'high' which outputs thinking. 'none' gives clean output.
    reasoning_effort: "none",
  });

  const res = await httpsPost(FIREWORKS_API_URL, { Authorization: `Bearer ${apiKey}` }, payload);
  if (res.status < 200 || res.status >= 300) {
    console.error(`[Fireworks] API error ${res.status}: ${res.body.slice(0, 500)}`);
    throw new Error(`Fireworks API ${res.status}: ${res.body.slice(0, 200)}`);
  }

  const data: ChatCompletionResponse = JSON.parse(res.body);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Fireworks returned empty response");

  // Log reasoning_content separately if present (not used in output)
  const reasoning = data.choices?.[0]?.message?.reasoning_content;
  if (reasoning) {
    console.log(`[Fireworks] Reasoning (ignored): ${reasoning.slice(0, 100)}...`);
  }

  return content;
}

export async function generateInsight(
  systemPrompt: string,
  userPrompt: string,
  options?: { model?: string; maxTokens?: number }
): Promise<string> {
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];
  const content = await chatCompletion(messages, { ...options, temperature: 0.3 });
  console.log(`[AI] Response (${content.length} chars): ${content.slice(0, 200)}`);
  return content;
}

export function resetModelCache(): void {
  resolvedModel = null;
}
