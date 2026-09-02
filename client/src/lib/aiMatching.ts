/**
 * USP-08: AI-powered problem-to-institution routing.
 *
 * The SIH problem statement (ID 26043) explicitly asks for an "AI-enabled
 * problem management module" that routes "validated problem statements to
 * appropriate universities based on their academic disciplines, research
 * expertise... and faculty specialization" — a real model call, not a
 * keyword heuristic dressed up as one. This module makes that call via
 * Groq (same provider/key already used for image auto-categorization, see
 * `groqVision.ts`), and is the primary source for USP-08's match scores.
 *
 * `client/src/lib/matching.ts`'s deterministic scorer is kept as an
 * *offline fallback only* — used while the AI call is in flight (so the
 * page never shows a blank state) and if the call fails (no API key,
 * network error, rate limit). Callers must label which source produced a
 * given score; never present a fallback score as "AI-ranked".
 */
import { callGroqJSON } from "@/lib/groqClient";

export type AiScoredItem = { score: number; reasons: string[] };

type ChallengeInput = {
  id: number;
  title: string;
  domain: string;
  description: string;
  district: string;
};

type InstitutionInput = {
  id: number;
  name: string;
  departments?: string | null;
  expertise?: string | null;
  priorityDomains?: string | null;
  location?: string | null;
};

// Keeps the prompt/response payload bounded regardless of how large the
// live challenge or institution list grows.
const MAX_CHALLENGES_PER_CALL = 60;
const MAX_INSTITUTIONS_PER_CALL = 40;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const ROUTING_CONTEXT =
  'You are the AI routing engine for "Samadhan," a Government of Jharkhand ' +
  "civic-innovation platform built for SIH problem statement 26043, which " +
  'explicitly requires "routing validated problem statements to appropriate ' +
  "universities based on their academic disciplines, research expertise, " +
  'innovation centres, incubation facilities, and faculty specialization." ' +
  "Score fit realistically: two things merely being in the same state (Jharkhand) " +
  "is NOT a reason to score highly on its own — a genuine match must relate to the " +
  "institution's actual stated departments, expertise, or priority domains. " +
  "Never inflate a score just to be encouraging; a poor match should score low.";

function parseScoredArray(
  raw: unknown,
  refToId: Map<string, number>
): Map<number, AiScoredItem> {
  const result = new Map<number, AiScoredItem>();
  if (!Array.isArray(raw)) return result;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const id = refToId.get(String(record.ref));
    if (id === undefined) continue;
    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(record.score) || 0))
    );
    const reasons = Array.isArray(record.reasons)
      ? record.reasons.map(String).slice(0, 3)
      : [];
    result.set(id, { score, reasons });
  }
  return result;
}

/** Ranks open `challenges` by fit for a single `institution` — powers the
 * institute-side "Suggested for you" tab/dashboard section. One Groq call
 * regardless of how many challenges are open, using short `ref` ids (`C1`,
 * `C2`, …) instead of echoing back large numeric Firestore ids, which the
 * model is prone to mistyping/truncating. */
export async function rankChallengesForInstitution(
  institution: InstitutionInput,
  challenges: ChallengeInput[]
): Promise<Map<number, AiScoredItem>> {
  const capped = challenges.slice(0, MAX_CHALLENGES_PER_CALL);
  if (capped.length === 0) return new Map();

  const refToId = new Map(capped.map((c, i) => [`C${i + 1}`, c.id]));
  const payload = {
    institution: {
      name: institution.name,
      departments: institution.departments || "(not provided)",
      expertise: institution.expertise || "(not provided)",
      priorityDomains: institution.priorityDomains || "(not provided)",
      location: institution.location || "(not provided)",
    },
    challenges: capped.map((c, i) => ({
      ref: `C${i + 1}`,
      domain: c.domain,
      district: c.district,
      title: truncate(c.title, 120),
      description: truncate(c.description, 220),
    })),
  };

  const system =
    `${ROUTING_CONTEXT}\n\nYou will receive one institution profile and a ` +
    'list of open civic problem reports, each with a short "ref" like "C1". ' +
    "For EVERY ref provided, score 0-100 how well that problem matches this " +
    "institution's academic capability, and give 1-2 short plain-English " +
    "reasons (not code, not field names) citing the specific department or " +
    "expertise that matches — or, if nothing matches, say so plainly and " +
    "keep the score low. Return ONLY a raw JSON array, no markdown, no " +
    'prose before or after: [{"ref":"C1","score":87,"reasons":["..."]}]. ' +
    "Include every ref exactly once, in any order.";

  const raw = await callGroqJSON(
    [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload) },
    ],
    { temperature: 0.2, maxTokens: 4096 }
  );

  return parseScoredArray(raw, refToId);
}

/** Ranks verified `institutions` by fit for a single `challenge` — powers
 * the admin "Suggested institutions" panel. */
export async function rankInstitutionsForChallenge(
  challenge: ChallengeInput,
  institutions: InstitutionInput[]
): Promise<Map<number, AiScoredItem>> {
  const capped = institutions.slice(0, MAX_INSTITUTIONS_PER_CALL);
  if (capped.length === 0) return new Map();

  const refToId = new Map(capped.map((org, i) => [`I${i + 1}`, org.id]));
  const payload = {
    challenge: {
      domain: challenge.domain,
      district: challenge.district,
      title: truncate(challenge.title, 160),
      description: truncate(challenge.description, 400),
    },
    institutions: capped.map((org, i) => ({
      ref: `I${i + 1}`,
      name: org.name,
      departments: org.departments || "(not provided)",
      expertise: org.expertise || "(not provided)",
      priorityDomains: org.priorityDomains || "(not provided)",
      location: org.location || "(not provided)",
    })),
  };

  const system =
    `${ROUTING_CONTEXT}\n\nYou will receive one civic problem report and a ` +
    'list of verified institutions, each with a short "ref" like "I1". For ' +
    "EVERY ref provided, score 0-100 how well that institution's academic " +
    "capability fits this specific problem, and give 1-2 short plain-English " +
    "reasons citing the specific department or expertise that matches — or, " +
    "if nothing matches, say so plainly and keep the score low. Return ONLY " +
    "a raw JSON array, no markdown, no prose before or after: " +
    '[{"ref":"I1","score":87,"reasons":["..."]}]. Include every ref exactly ' +
    "once, in any order.";

  const raw = await callGroqJSON(
    [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload) },
    ],
    { temperature: 0.2, maxTokens: 3072 }
  );

  return parseScoredArray(raw, refToId);
}
