/**
 * Groq Vision API client — auto-categorize civic challenge images.
 *
 * Uses qwen/qwen3.6-27b (JSON mode) on Groq's free tier (30 RPM, 1000 RPD).
 * API key is in VITE_GROQ_API_KEY (exposed to browser — acceptable for SIH demo).
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "qwen/qwen3.6-27b";

export type VisionResult = {
  title: string;
  description: string;
  domain: string;
};

const SYSTEM_PROMPT = `You are a civic challenge analyst for Jharkhand, India. Analyze the uploaded image and return a JSON object with exactly these fields:

- "title": A short, clear title for the civic problem shown (max 80 chars)
- "description": A 2-3 sentence description of the problem, its impact, and location context
- "domain": One of exactly these 6 values: "Water", "Education", "Health", "Agriculture", "Infrastructure", "Livelihoods"

Rules:
- If the image shows a water problem (broken pipe, dry well, contaminated water), use "Water"
- If it shows a school/education issue, use "Education"
- If it shows a health/medical facility problem, use "Health"
- If it shows farming/agriculture damage, use "Agriculture"
- If it shows road/building/infrastructure damage, use "Infrastructure"
- If it shows livelihood/employment/income issues, use "Livelihoods"
- Always return valid JSON, no markdown, no code fences
- Be specific about the location context visible in the image
- Write in English, professional tone`;

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
              text: "Analyze this image of a civic problem in Jharkhand and return the JSON.",
            },
            {
              type: "image_url",
              image_url: { url: base64DataUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Groq API error ${response.status}: ${errorBody.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response from Groq vision model");
  }

  const parsed = JSON.parse(content) as Record<string, unknown>;
  const validDomains = [
    "Water",
    "Education",
    "Health",
    "Agriculture",
    "Infrastructure",
    "Livelihoods",
  ];
  const domain = validDomains.includes(parsed.domain as string)
    ? (parsed.domain as string)
    : "Infrastructure";

  return {
    title: String(parsed.title ?? "").slice(0, 80),
    description: String(parsed.description ?? ""),
    domain,
  };
}
