# Update 1 — AI Auto-Categorize + Duplicate Detection

## What Was Implemented

Two AI-powered features added to Samadhan's challenge submission flow:

1. **AI Image Categorization** — Upload a photo of a civic problem → Groq Vision API analyzes it → auto-fills title, description, and domain fields
2. **Duplicate Detection** — Before submit, checks if a similar report already exists in the same district → warns user to avoid duplicate entries

## How It Works

### Flow

```
User picks image on /citizen/submit
  │
  ├── Click "AI scan — auto-fill from photo"
  │   │
  │   ├── [Parallel] Groq Vision API call
  │   │   └── Returns: {title, description, domain}
  │   │       └── Form fields auto-filled (user reviews before submit)
  │   │
  │   └── [Parallel] Duplicate check
  │       └── Same district + title similarity > 60%
  │           └── Red banner: "Possible duplicate detected"
  │
  └── User edits fields if needed → Submit
```

### Tech Stack

- **AI Model**: `qwen/qwen3.6-27b` (27B multimodal, JSON mode, 500 tps)
- **API**: Groq Free Tier (30 RPM, 1,000 RPD, 8,000 TPM)
- **No new backend**: All client-side, runs in browser
- **No new Firestore collections**: Uses existing `challenges` collection

## Files Created / Modified

### New Files

| File                               | Purpose                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `client/src/lib/groqVision.ts`     | Groq Vision API client — sends image to `qwen/qwen3.6-27b` JSON mode, returns `{title, description, domain}` |
| `client/src/lib/duplicateCheck.ts` | Duplicate detection — compares title word-overlap similarity against same-district challenges                |

### Modified Files

| File                                   | Change                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `.env`                                 | Added `VITE_GROQ_API_KEY`                                                  |
| `client/src/lib/storage.ts`            | Added `pHashFromCanvas()` and `hammingDistance()` for perceptual hashing   |
| `drizzle/schema.ts`                    | Added `duplicateCount: int` field to `challenges` table (type-only)        |
| `client/src/lib/db.ts`                 | Added `incrementDuplicateCount(challengeId)` function                      |
| `client/src/pages/SubmitChallenge.tsx` | Added "AI scan" button, `aiScanImage()` function, duplicate warning banner |

## Detailed File Breakdown

### `client/src/lib/groqVision.ts` (NEW)

**What it does**: Calls Groq's Vision API with a base64 image and returns structured JSON.

**Key function**:

```typescript
export async function analyzeImage(
  base64DataUrl: string
): Promise<VisionResult>;
```

**How it works**:

1. Reads `VITE_GROQ_API_KEY` from env
2. Sends POST to `https://api.groq.com/openai/v1/chat/completions`
3. Model: `qwen/qwen3.6-27b` with `response_format: { type: "json_object" }`
4. System prompt instructs model to analyze civic problems in Jharkhand
5. Returns `{ title: string, description: string, domain: string }`
6. Domain is validated against allowed values: `Water | Education | Health | Agriculture | Infrastructure | Livelihoods`

**Cost**: ~2,048 tokens per image → ~4 images/minute, 1,000/day on free tier

### `client/src/lib/duplicateCheck.ts` (NEW)

**What it does**: Checks if a new challenge is a duplicate of an existing one in the same district.

**Key function**:

```typescript
export function checkTitleDuplicate(
  district: string,
  title: string,
  existingChallenges: Array<{ district: string; title: string; id: number }>
): DuplicateResult;
```

**How it works**:

1. Filters `existingChallenges` to same district
2. Tokenizes both titles into words (removes words < 4 chars)
3. Calculates word-overlap similarity: `commonWords / totalWords`
4. If similarity > 60% → returns `{ isDuplicate: true, matchId, matchTitle }`
5. Returns `{ isDuplicate: false }` if no match

**Why title-based (not pHash)**: Full pHash comparison would require fetching all `challengeEvidence` docs (each has 680KB base64 `fileData`) — too heavy. Title similarity is lightweight and catches the majority of duplicates.

### `client/src/lib/storage.ts` (MODIFIED)

**What was added**:

```typescript
export function pHashFromCanvas(canvas: HTMLCanvasElement): string;
export function hammingDistance(a: string, b: string): number;
```

**`pHashFromCanvas`**:

1. Samples canvas to 32x32 grayscale
2. Divides into 8x8 blocks, computes average brightness per block
3. Builds 64-bit hash: 1 if block > mean, 0 otherwise
4. Returns hex string (e.g., `"1011010011010011..."`)

**`hammingDistance`**:

- Counts differing bits between two binary strings
- Returns number (0 = identical, 64 = completely different)

**Note**: These functions are available but not yet wired into the duplicate check (title-based is lighter for now). They're ready for future pHash-based duplicate detection if needed.

### `drizzle/schema.ts` (MODIFIED)

**What was added** (line ~137):

```typescript
duplicateCount: int("duplicateCount"),
```

- Type-only field on `challenges` table
- Firestore is schemaless — old records without this field read as `undefined` (treated as 0)
- No migration needed

### `client/src/lib/db.ts` (MODIFIED)

**What was added** (after `updateChallenge`):

```typescript
export async function incrementDuplicateCount(challengeId: number);
```

- Reads current `duplicateCount` (default 0)
- Increments by 1 via `updateChallenge(challengeId, { duplicateCount: currentCount + 1 })`
- Uses `omitUndefined()` filter (existing pattern) — safe for old records

### `client/src/pages/SubmitChallenge.tsx` (MODIFIED)

**New imports**:

```typescript
import { analyzeImage } from "@/lib/groqVision";
import {
  checkTitleDuplicate,
  type DuplicateResult,
} from "@/lib/duplicateCheck";
import { Sparkles, AlertTriangle } from "lucide-react";
```

**New state variables**:

```typescript
const [aiScanning, setAiScanning] = useState(false);
const [duplicateWarning, setDuplicateWarning] =
  useState<DuplicateResult | null>(null);
const aiScanInput = useRef<HTMLInputElement>(null);
const challengesQuery = trpc.workflow.challenges.useQuery({});
```

**New function `aiScanImage(file: File)`**:

1. Converts file to base64 via `toBase64(file)`
2. Runs `analyzeImage(base64)` in parallel with `checkTitleDuplicate()`
3. If AI succeeds: sets `title`, `description`, `domain` (only if not already filled by user)
4. If duplicate found: sets `duplicateWarning` state → renders red banner
5. Adds file to `files[]` for evidence upload
6. Shows toast: "AI analyzed the image — review the suggested fields below"

**New UI elements**:

1. **AI Scan button** (purple `Sparkles` icon) — below the existing "Scan handwriting" button
2. **Duplicate warning banner** — red `AlertTriangle` card with "Possible duplicate detected" + link to existing challenge

## Environment Variables

| Variable            | Value          | Purpose                       |
| ------------------- | -------------- | ----------------------------- |
| `VITE_GROQ_API_KEY` | `your api key` | Groq API key for Vision model |

**Note**: `VITE_` prefix means this is exposed to the browser (Vite bundles env vars starting with `VITE_` into client code). Acceptable for SIH demo. In production, use a Cloudflare Worker proxy to hide the key.

## Groq Free Tier Limits

| Spec         | Value                               |
| ------------ | ----------------------------------- |
| Model        | `qwen/qwen3.6-27b` (27B multimodal) |
| Requests/min | 30                                  |
| Requests/day | 1,000                               |
| Tokens/min   | 8,000                               |
| Tokens/day   | 200,000                             |
| Image cost   | ~2,048 tokens                       |
| Cost         | Free (no credit card)               |

## How to Test

1. Run `npm run dev`
2. Go to `/citizen/submit`
3. Pick an image of a civic problem (e.g., broken road, dry well)
4. Click "AI scan — auto-fill from photo"
5. Watch title/description/domain auto-fill
6. Enter same district + similar title as existing challenge → see duplicate warning

## Deploy

```bash
npm run build
npm run deploy
```

No `deploy:rules` needed — `duplicateCount` is a regular field on `challenges` (already `allow write if isSignedIn()` in `firestore.rules:77`).
