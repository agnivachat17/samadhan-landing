# USP-02 — Bhasha & Bol: Hindi Voice + Handwriting → Auto-fill

**Problem:** `SubmitChallenge.tsx:118` title/description/domain/district are English-only typed inputs. World Bank CIVIC AI June 2025 (CivicBridge: "upload voice/photo/handwritten, AI auto-detects language, zero-friction filing") + PIB 30 May 2026 `Samadhan Didi` (CPGRAMS voice bot: speak to file, no forms) are now the national standard. Jharkhand needs Hindi + Santali (Ol Chiki) / Mundari for 750 Abua Clinics and field workers. Generic portals are English form hell.

**Goal:** Voice (Hindi `hi-IN`) + handwriting OCR -> auto-fills `title` / `description` / `district` / `domain` + `normalizeDomain()` bucket (`Challenges.tsx:87`). On-device, Spark-safe, no server LLM.

**Stack:** `Web Speech API (webkitSpeechRecognition)` + `tesseract.js` (lazy import) + `JHARKHAND_DISTRICTS:5` + `normalizeDomain` keyword map. No backend.

## Steps

### 1. Install (5m)

```bash
npm install tesseract.js
```

Lazy-import inside handler (`import("tesseract.js")`) — don't top-level import; `tesseract.js` is ~1.2MB wasm, must be code-split or bundle `1.96MB -> 3MB`.

### 2. Voice component (60m) — new `client/src/components/VoiceCapture.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Languages } from "lucide-react";

type Fill = { title: string; description: string; district?: string; domain?: string };

function parseTranscript(t: string, districts: string[]): Fill {
  const lower = t.toLowerCase();
  // District: first Jharkhand district name found
  const district = districts.find(d => lower.includes(d.toLowerCase()));
  // Domain keywords (Hindi + English)
  const kw: Record<string,string> = {
    pani: "Water", jal: "Water", water: "Water",
    school: "Education", shiksha: "Education", vidyalaya: "Education",
    health: "Health", swasthya: "Health", hospital: "Health",
    kheti: "Agriculture", fasal: "Agriculture", agriculture: "Agriculture",
    sadak: "Infrastructure", bijli: "Infrastructure", road: "Infrastructure",
    rozgar: "Livelihoods", livelihood: "Livelihoods",
  };
  let domain: string|undefined;
  for (const [k,v] of Object.entries(kw)) if (lower.includes(k)) { domain=v; break; }
  // Title = first sentence (up to 80 chars), description = full transcript
  const first = t.split(/[।.|!?\n]/)[0]?.trim() || t.slice(0,80);
  return { title: first.slice(0,80), description: t.trim(), district, domain };
}

export function VoiceCapture({ districts, onFill }: { districts: string[]; onFill: (f: Fill)=>void }) {
  const [lang, setLang] = useState<"hi-IN"|"en-IN">("hi-IN");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<any>(null);

  function ensureRec() {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) throw new Error("Voice not supported in this browser — use Chrome.");
    if (recRef.current) return recRef.current;
    const r = new Ctor();
    r.lang = lang; r.interimResults = false; r.continuous = false;
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript as string;
      setTranscript(text);
      onFill(parseTranscript(text, districts));
      setListening(false);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    return r;
  }

  useEffect(()=>{ if(recRef.current) recRef.current.lang = lang; }, [lang]);

  return (
    <div className="mb-5 rounded-xl border border-[#9d876a]/40 bg-[#f7f0e5]/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">Bhasha & Bol — speak to file</p>
        <button type="button" onClick={()=>setLang(l=>l==="hi-IN"?"en-IN":"hi-IN")}
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono-ui text-[0.6rem] uppercase"><Languages size={12}/>{lang}</button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={()=>{ const r=ensureRec(); r.start(); setListening(true); }}
          className={`rounded-full inline-flex items-center gap-2 px-5 py-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${listening?"bg-[#16422f] text-white":"bg-[#c94a20] text-white"}`}>
          {listening ? <MicOff size={16}/> : <Mic size={16}/>} {listening ? "Listening…" : `Mic (${lang})`}
        </button>
        {transcript && <p className="font-body text-[0.78rem] text-[#334c41]">"{transcript}"</p>}
      </div>
      <p className="mt-2 font-body text-[0.68rem] text-[#66766e]">Tip: say district + problem, e.g. "Palamu me paani ki samasya, handpump kharab hai."</p>
    </div>
  );
}
```

- Chrome `hi-IN` is widely supported; Firefox fallback shows error toast with `sonner`.
- `parseTranscript` intentionally naive — no LLM needed; judges see on-device parsing, not cloud.

### 3. Handwriting OCR (40m) — add to `SubmitChallenge.tsx:220 Evidence`

Add button `Scan handwritten note`:

```tsx
import { useState } from "react";
async function scanHandwriting(file: File, onFill: (f: Fill)=>void, districts: string[]) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("hin+eng");
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();
  // reuse parseTranscript from VoiceCapture (extract to shared `lib/bhasha.ts`)
  onFill(parseTranscript(text, districts));
  // also keep the scan image as evidence via existing prepareStoredFile path
}
```

- Place as secondary button under Evidence dropzone: `"Scan handwritten complaint (Hindi/English)"` -> file picker `accept="image/*"` -> runs OCR -> fills form + retains image for evidence upload.
- Reuse `parseTranscript` by moving it to `client/src/lib/bhasha.ts` (`export function parseTranscript(...)`) imported by both `VoiceCapture` and scanner.

### 4. Wire form (30m) — `client/src/pages/SubmitChallenge.tsx:10`

Convert `title/description` from uncontrolled `FormData` to controlled so fill is visible:

```tsx
const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
// VoiceCapture onFill:
<VoiceCapture districts={JHARKHAND_DISTRICTS.map(d=>d.name)} onFill={f=>{
  setTitle(f.title); setDescription(f.description);
  if (f.district && !districtEdited) setDistrict(f.district);
  if (f.domain) (document.querySelector('select[name="domain"]') as HTMLSelectElement).value = f.domain;
}} />
```

- Keep `FormData` submit fallback but prefer controlled state: `payload.title = title || text(data,"title")`.
- Import `JHARKHAND_DISTRICTS:5` + `parseTranscript` from `lib/bhasha.ts`.

### 5. Language toggle polish (15m)

- Keep English UI; toggle only affects Voice `lang` + placeholders (`placeholder={lang==="hi-IN" ? "शीर्षक लिखें" : "Enter title"}`) — not full i18n (scope).
- For Santali Ol Chiki: add `Noto Sans Ol Chiki` font in `client/src/index.css` and `tesseract` lang `sat` pack (optional phase 2, document as future).

### 6. Verify

1. `npm run check && npm run build` — ensure `tesseract.js` is code-split (`vite` should show separate chunk, not main bundle bloat).
2. Chrome (hi-IN voice requires HTTPS or localhost — `npm run dev` on localhost qualifies) -> click Mic -> speak `"Palamu me paani ki samasya, handpump teen hafte se kharab hai"` -> form fills title `Palamu me paani ki samasya` + district `Palamu` + domain `Water` -> submit -> `/citizen/challenges/:id` shows pinned district via `LocationPicker districtEdited` (`SubmitChallenge.tsx:20`).
3. Handwrite "Gumla school road kharab" on paper -> photo -> Scan -> same fill.
4. Firefox fallback: toast "Voice not supported — type or scan instead."

### Demo script (40s, memorable)

Judge watches: click `Mic (hi-IN)` -> speak Hindi -> form auto-fills in real time -> submit -> challenge appears with Water domain + Palamu district map pin. Say: "This is Samadhan Didi on-device — aligns with PIB 30 May 2026 CPGRAMS voice bot, but works offline on Spark without sending audio to any server."

### Risks

- `SpeechRecognition` only in Chrome/Edge/Safari; always show typed fallback. Don't block submission on voice failure.
- Tesseract `hin` pack ~8MB wasm fetch on first scan — show `Loader2` (`lucide-react`) + "Reading handwriting…" and cache worker.
- `normalizeDomain` keyword map is heuristic — false domain is okay (user can correct select); never auto-submit without user confirming filled fields.
