/**
 * Groq Vision API client — auto-categorize civic challenge images.
 *
 * Uses qwen/qwen3.6-27b on Groq's free tier (30 RPM, 1000 RPD).
 * API key is in VITE_GROQ_API_KEY (exposed to browser — acceptable for SIH demo).
 */
import { callGroqJSON } from "@/lib/groqClient";

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

export async function analyzeImage(
  base64DataUrl: string
): Promise<VisionResult> {
  const parsed = (await callGroqJSON(
    [
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
    { temperature: 0.3, maxTokens: 256 }
  )) as Record<string, unknown>;

  const domain = VALID_DOMAINS.includes(parsed.domain as string)
    ? (parsed.domain as string)
    : "Infrastructure";

  return {
    title: String(parsed.title ?? "").slice(0, 80),
    description: String(parsed.description ?? ""),
    domain,
  };
}
