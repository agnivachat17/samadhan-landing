/**
 * Shared Groq chat-completions client — the one place that knows the API
 * URL, model, key lookup, and "the model sometimes wraps JSON in <think>
 * tags or prose" parsing. `groqVision.ts` (image auto-categorize) and
 * `aiMatching.ts` (USP-08 AI routing) both call `callGroqJSON` rather than
 * each hand-rolling their own fetch/parse logic.
 */

export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "qwen/qwen3.6-27b";

export function getGroqApiKey(): string | undefined {
  return import.meta.env.VITE_GROQ_API_KEY as string | undefined;
}

/**
 * Extracts a JSON value (object or array) from a chat-completion's text
 * content. Qwen's reasoning mode sometimes emits a `<think>...</think>`
 * block before the answer even with `reasoning_effort: "none"`, and
 * occasionally wraps the JSON in prose/markdown fences despite instructions
 * not to — so this strips think-blocks first, tries a direct parse, then
 * falls back to matching the first top-level `{...}`/`[...]` span.
 */
export function extractJson(text: string): unknown {
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // fall through to regex extraction below
  }
  for (const candidate of [stripped, text]) {
    const match = candidate.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // try the next candidate
      }
    }
  }
  throw new Error("No JSON found in Groq response");
}

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

export async function callGroqJSON(
  messages: GroqMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<unknown> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("Groq API key not configured");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 512,
      reasoning_effort: "none",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Groq API error ${response.status}: ${errorBody.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response from Groq model");
  }
  return extractJson(content);
}
