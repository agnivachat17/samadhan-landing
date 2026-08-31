/**
 * Groq Vision API client — auto-categorize civic challenge images.
 *
 * Uses qwen/qwen3.6-27b on Groq's free tier (30 RPM, 1000 RPD).
 * API key is in VITE_GROQ_API_KEY (exposed to browser — acceptable for SIH demo).
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "qwen/qwen3.6-27b";

export type VisionResult = {
  title: string;
  description: string;
  domain: string;
};

const VALID_DOMAINS = [
  "Water",
  "Education",
  "Health",
  "Agriculture",
  "Infrastructure",
  "Livelihoods",
];

const SYSTEM_PROMPT = `Analyze the image of a civic problem in Jharkhand, India. You MUST return ONLY a raw JSON object with these exact fields and nothing else:

{"title":"short title","description":"2-3 sentence description","domain":"one of Water Education Health Agriculture Infrastructure Livelihoods"}

Do NOT use thinking tags. Do NOT explain. Return ONLY the JSON object.`;

function extractJson(text: string): Record<string, unknown> {
  // Strip <think>...</think> blocks (Qwen thinking mode)
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // Try to find JSON in the cleaned response
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  // Fallback: try the original text
  const fallbackMatch = text.match(/\{[\s\S]*\}/);
  if (fallbackMatch) {
    return JSON.parse(fallbackMatch[0]);
  }

  throw new Error("No JSON found in response");
}

export async function analyzeImage(
  base64DataUrl: string
): Promise<VisionResult> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
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
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this civic problem image and return ONLY the JSON.",
            },
            {
              type: "image_url",
              image_url: { url: base64DataUrl },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 256,
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
    throw new Error("No response from Groq vision model");
  }

  const parsed = extractJson(content);
  const domain = VALID_DOMAINS.includes(parsed.domain as string)
    ? (parsed.domain as string)
    : "Infrastructure";

  return {
    title: String(parsed.title ?? "").slice(0, 80),
    description: String(parsed.description ?? ""),
    domain,
  };
}
