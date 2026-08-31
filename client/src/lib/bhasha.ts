/** "Bhasha & Bol" — shared parsing for voice (VoiceCapture.tsx) and handwriting-OCR
 * (SubmitChallenge.tsx) capture, so both fill the challenge form the same way.
 * Intentionally a naive keyword parser, not an LLM call — this project has no
 * backend, and on-device parsing is itself the feature (see docs/USP-02-bhasha-bol.md). */

export type BhashaFill = {
  title: string;
  description: string;
  district?: string;
  domain?: string;
};

/** Matches the domain <select> options in SubmitChallenge.tsx exactly — keep in sync
 * if that list changes. */
const DOMAIN_KEYWORDS: Record<string, string> = {
  pani: "Water",
  jal: "Water",
  water: "Water",
  handpump: "Water",
  school: "Education",
  shiksha: "Education",
  vidyalaya: "Education",
  padhai: "Education",
  education: "Education",
  health: "Health",
  swasthya: "Health",
  hospital: "Health",
  bimari: "Health",
  ilaj: "Health",
  kheti: "Agriculture",
  fasal: "Agriculture",
  kisan: "Agriculture",
  agriculture: "Agriculture",
  sadak: "Infrastructure",
  bijli: "Infrastructure",
  road: "Infrastructure",
  infrastructure: "Infrastructure",
  rozgar: "Livelihoods",
  naukri: "Livelihoods",
  livelihood: "Livelihoods",
  livelihoods: "Livelihoods",
};

/** Naive, on-device transcript/OCR-text -> form-field parser. False positives are
 * expected and fine — the user always sees and can correct the filled fields before
 * submitting; this never auto-submits. */
export function parseBhashaText(raw: string, districts: string[]): BhashaFill {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  const district = districts.find(d => lower.includes(d.toLowerCase()));

  let domain: string | undefined;
  for (const [keyword, value] of Object.entries(DOMAIN_KEYWORDS)) {
    if (lower.includes(keyword)) {
      domain = value;
      break;
    }
  }

  const firstSentence = trimmed.split(/[।.|!?\n]/)[0]?.trim();
  const title = (firstSentence || trimmed).slice(0, 80);

  return { title, description: trimmed, district, domain };
}
