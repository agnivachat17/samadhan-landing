# USP-09 — Assisted & Delegated Reporting (No-Smartphone / CSC / Panchayat-Assisted Access)

**Status:** Implemented. Assisted toggle on `/citizen/submit`, demo OTP (SHA-256 hash + 7-day expiry stored on the challenge), OTP-gated delegated confirmation in `CitizenCloseoutConfirm.tsx`, beneficiary strip on `ChallengeDetail.tsx`, and CSC kiosk at `/csc/submit` + `/assisted/submit` (large-touch, forced-assisted). Rules deployed. See Implementation notes below; original design spec is preserved after it for context.

## Real-world problem

Samadhan's current reporting path is: sign in with Firebase Auth (email/password, Google, or Facebook) → fill a web form at `/citizen/submit`, optionally helped by Bhasha & Bol voice/OCR (USP-02, verified implemented) → the report belongs to that signed-in account forever, because `challenge.citizenEmail` is the account's own email and the entire USP-07 citizen-confirmation loop (`CitizenCloseoutConfirm.tsx`) checks `user.email.toLowerCase() === challenge.citizenEmail.toLowerCase()` before letting anyone confirm or dispute a closeout. **This means the platform structurally requires the original reporter to personally own a device, an account, and to come back later on that same account to close the loop.** A citizen with no smartphone, no email address, or no comfort with a login flow cannot use Samadhan at all today — not even with Bhasha & Bol's voice input, because voice input still requires someone to be operating a signed-in session on a device.

The problem statement itself explicitly names this constituency as an intended submitter group: _"Allowing citizens, community organizations, local bodies, and government agencies to submit societal challenges..."_ — **local bodies (Panchayati Raj Institutions, Urban Local Bodies) and community organizations are named alongside citizens as direct submitters**, not merely as downstream stakeholders. As verified in this session, Samadhan has exactly four roles (`client/src/lib/roles.ts`: `citizen | institution | industry | admin`) and no submission path for a Panchayat, ULB, or community organization acting on someone else's behalf, or on its own behalf as a body.

## Research/evidence behind the problem

- `research/SAMADHAN_Research_Points_11-20.docx` §16 (verified, extracted and read in this session): TRAI, Nov 2025 — 692.16M urban vs. **542.37M rural telephone subscribers**, but explicitly cautions "subscriber counts should not be treated as equivalent to unique individuals with reliable internet access." §16.4: Common Service Centres number **5,01,731**, covering more than 2.5 lakh Gram Panchayats; BharatNet had connected **more than 2.14 lakh Panchayats** by December 2025. The research's own conclusion: _"The platform should not be mobile-app-only. Recommended layers: app + web + WhatsApp + SMS + voice/IVR + CSC-assisted reporting + Panchayat-assisted reporting."_
- `research/22.pdf` §30.1 (verified): JharSewa/e-District already routes citizens without smartphones or digital skills through **Common Service Centres** — an existing, government-operated assisted-access channel Samadhan could plug into rather than build from scratch.
- `research/Samadhan_Research_Samrajni.docx` §1.6 (verified): explicitly flags that CPGRAMS "requires citizens to use a digital portal/app-based process," and that "this makes digital accessibility and alternative access channels important when designing a citizen-facing grievance system" — i.e., the research explicitly identifies this exact gap in the _reference system_, which Samadhan currently repeats.
- Jharkhand is majority rural (~76% per Jharkhand Economic Survey 2025-26, `Samadhan_Research_Samrajni.docx` §2.2, verified) — a web-only platform is architecturally mismatched to the state it targets.

## Who is affected

- Citizens with no smartphone at all (feature-phone-only households, common in rural Jharkhand per the TRAI rural/urban subscriber split above).
- Citizens with a shared household phone who can't maintain a persistent personal login.
- Elderly citizens uncomfortable with app/account flows regardless of device ownership.
- Illiterate/semi-literate citizens who — even with Bhasha & Bol's voice fill — still need to physically navigate a touchscreen form to submit and review before pressing Submit (Bhasha & Bol explicitly never auto-submits, per the project architecture notes, precisely because a heuristic parse needs human review; someone still has to see and confirm the screen).
- Panchayats, Urban Local Bodies, and community organizations, who the problem statement explicitly names as submitters in their own right, not just proxies.
- Citizens in low/no-connectivity pockets who exceed what USP-01's offline IndexedDB queue solves (USP-01 still requires the citizen to own a device running the PWA and eventually get _some_ connectivity to drain the queue — it doesn't solve "no device" or "no digital literacy" at all, only "device + intermittent connectivity").

## Why existing systems fail

CPGRAMS is explicitly documented in the team's own research (above) as suffering from this exact gap. JharSewa solves it at the _government-services_ level via CSC, but that's a separate platform, not something citizen-facing civic-problem reporting inherits automatically. Samadhan, as verified in this session, currently has zero mechanism for a third party (CSC operator, Panchayat clerk, community organization volunteer, family member) to submit _and later confirm resolution_ on behalf of someone who can't do it themselves — the ownership model is rigidly "the signed-in account that created the report is the only one who can ever close the loop."

## Proposed Samadhan solution

**Delegated/assisted reporting with an explicit, auditable proxy relationship** — not a UI simplification, a change to who is allowed to act on a report and how that's recorded:

1. **Assisted-submission mode.** Any authenticated citizen, institution member, or a new lightweight "community assistant" account type can submit a challenge _on behalf of_ a named beneficiary, capturing the beneficiary's name/phone/consent instead of requiring the beneficiary to have their own Samadhan login. The report is tagged `submittedVia: "assisted"` with the assistant's own account as `submittedByUid`, distinct from `beneficiaryName`/`beneficiaryPhone` — the report is _for_ the beneficiary but _filed by_ the assistant.
2. **Delegated closeout confirmation.** Because the USP-07 confirmation loop (`CitizenCloseoutConfirm.tsx`) currently hard-requires `user.email === challenge.citizenEmail`, assisted reports need a parallel path: an OTP sent to the beneficiary's phone (captured at submission) lets _the beneficiary themselves_ — not the assistant — confirm or dispute the closeout without needing a full Samadhan account, preserving USP-07's core principle ("the citizen who reported it decides," not an intermediary or an admin) while removing the requirement that the citizen personally operate the web app.
3. **CSC/Panchayat-assisted kiosk view.** A stripped-down, large-touch-target "assisted intake" screen (reusing Bhasha & Bol's voice capture and OCR handwriting-scan, both already built and verified implemented) designed for an operator to run through repeatedly with different walk-in citizens in one sitting, without re-logging-in between each one.
4. **WhatsApp/SMS status channel (phased, not v1).** Given BHASHINI/Ayushman-Sarathi-style WhatsApp bots are a proven government pattern (`research/SAMADHAN_Research_Points_11-20.docx` §20.3, verified) and the team's own `docs/RESEARCH_ANALYSIS.md` already flags this as feasible, a citizen (or their assistant) can receive their tracking ID by SMS at submission and later text back "STATUS <id>" — this is scoped as a phased addition requiring a paid SMS/WhatsApp Business API key (the same tradeoff class already accepted for `VITE_GROQ_API_KEY`), not promised as done.

## How it works (realistic example)

An elderly farmer in a village in Gumla with no smartphone tells a Common Service Centre operator (an existing, government-run access point per the research) about a broken hand-pump. The operator opens Samadhan's assisted-intake screen under their own CSC operator account, uses the existing photo-upload + voice-capture flow to log the problem with the farmer's name and phone number as the beneficiary, and prints/reads back a tracking ID. Weeks later, once an institution has submitted before/after evidence, an SMS goes to the farmer's phone with a link and OTP; the farmer (or a literate neighbor helping them, one more layer of real-world assistance) opens the link, enters the OTP, sees the before/after photos, and taps "Yes, it's fixed" — closing the loop themselves, without ever having created a Samadhan account.

## What makes this genuinely different

This isn't "add a low-bandwidth mode" or "add multilingual support" — Samadhan already has both (USP-01 offline PWA, bilingual + Santali live translation). The genuinely new mechanism is **decoupling "who can file/close a report" from "who has a persistent Samadhan account,"** while still preserving USP-07's specific, deliberate design principle (verified from `docs/CLAUDE.md`) that _only the actual affected citizen_ — not an admin, not an intermediary — gets to decide whether a fix counts. Most civic platforms solve accessibility by making assisted-submission drop the citizen out of the loop entirely (an operator submits and that's the end of the citizen's involvement). Samadhan's design keeps the beneficiary as the final decision-maker via OTP-gated delegated confirmation, which is a meaningfully different (and harder to build correctly) mechanism than either "web-only" or "assisted submission with no closing-the-loop guarantee."

## Impact

Extends every USP-07 guarantee (citizen has the final say, public impact ledger, hash-anchored trust chain) to the exact population currently locked out of it — which, per the TRAI/rural-population numbers cited above, may be a majority of Jharkhand's population, not an edge case.

## Why this qualifies as a USP

Real problem (explicit PS-named submitter groups + majority-rural population structurally excluded from the current account model, verified against the actual `citizenEmail`-gated confirmation logic in this session) → specific mechanism (delegated submission + OTP-gated beneficiary-only confirmation, not just "simplify the form") → measurable impact (closes the accessibility gap the research explicitly flags CPGRAMS for) → clear differentiation (preserves the citizen-decides principle other assisted-reporting models typically drop).

## Technical approach

- `challenges` document gains optional fields (Firestore schemaless, so old records read as `undefined`, matching the project's existing additive-field convention used for `duplicateCount`/`selfEnrolled`): `submittedVia?: "self" | "assisted"`, `submittedByUid?: string`, `beneficiaryName?: string`, `beneficiaryPhone?: string`.
- New Firebase Auth custom claim or `users.role` addition is **not** needed for the assistant side — an existing citizen/institution account can act as an assistant; no new role required for filing.
- Delegated confirmation needs a **new, narrowly-scoped mechanism**: a short-lived OTP tied to `beneficiaryPhone` and the specific challenge/closeout-round ID, verified via a Cloud Function-free approach is not possible for SMS OTP (sending an SMS requires a server or a third-party API called from the client with an API key — the same accepted tradeoff pattern as Groq). This is the one piece of USP-09 that cannot be purely client+Firestore like the rest of Samadhan; it needs a lightweight serverless function (Cloudflare Worker, consistent with the existing Cloudflare deployment target) to call an SMS provider, since exposing an SMS-provider secret key client-side (unlike the already-accepted Groq tradeoff) would let anyone spam OTPs at the provider's expense.
- `firestore.rules` needs a new rule shape: allow updating `citizenConfirmation`/`citizenNotes` on a `projectCloseouts` document when a valid, unexpired OTP token (verified by the Worker, which then mints a short-lived custom Firebase Auth token or a signed claim) is presented, in addition to the existing `isSignedIn()` + email-match path. This is a genuinely new rules surface, not just a new field — it should be designed and reviewed carefully before deploying, per the project's own standing caution that `firestore.rules` is the entire security model.

## Integration with the existing system

- Reuses `VoiceCapture.tsx`, `bhasha.ts`, and the OCR handwriting-scan path in `SubmitChallenge.tsx` as-is for the kiosk intake screen — no new voice/OCR code.
- Reuses `BeforeAfterEvidence.tsx` and the existing `LedgerSeal` for the beneficiary's delegated-confirmation view — visually identical to `CitizenCloseoutConfirm.tsx`, just reached via an OTP link instead of a logged-in session.
- Does not change the existing self-service path at all — a citizen who does have a smartphone and account keeps using `/citizen/submit` and `CitizenCloseoutConfirm.tsx` exactly as today.

## Accessibility/inclusivity considerations

This _is_ the accessibility feature — it exists specifically for people the rest of the platform (including USP-01's offline PWA and USP-02's voice input) still assumes have a device and an account. Kiosk UI should use large touch targets, high contrast (matching the existing paper-editorial palette), and Bhasha & Bol as the default input method rather than typing.

## Government adoption considerations

Deliberately designed to plug into **existing** government-run access infrastructure (CSCs, Panchayat offices) rather than requiring Samadhan to deploy its own kiosks — directly following the research's own recommendation (`22.pdf` §30.1, verified) to build on JharSewa/CSC rather than parallel infrastructure. This is a strong "we're not asking for new infrastructure budget" answer for a government evaluator.

## Scalability considerations

The SMS/OTP piece is the one part of Samadhan that would incur a real per-message cost at scale (Twilio India pricing cited in research, `22.pdf` §25.3, verified: ~$0.08/message international rate, though a domestic India SMS gateway would likely be far cheaper — no domestic rate was verified in research, so this figure should not be quoted to judges as Samadhan's actual cost). This is the honest tradeoff to state: assisted reporting for the underserved is not free the way the rest of the Spark-plan architecture is, and a real deployment needs a small operating budget line for it.

## Abuse/failure cases and mitigation

- **Failure case: an assistant submits fabricated reports "on behalf of" a beneficiary who never asked for it.** Mitigation: OTP-gated delegated confirmation means a fabricated report can never be falsely marked "resolved" by the assistant — only the real beneficiary's phone can do that; a malicious assistant can still create noise (a duplicate-detection/spam problem, not unique to this USP) but cannot fake the citizen-confirms-fixed step that closes the loop and triggers confetti/resolution.
- **Failure case: beneficiary's phone number is wrong, unreachable, or the beneficiary doesn't have a phone either.** Mitigation: falls back to the existing admin-visible "no closeout confirmation received" state already implicit in USP-07's round-based cycle — the report and its status remain visible on the public ledger even if the citizen-confirmation step can never complete, rather than the whole report failing.
- **Failure case: OTP interception/SIM-swap style attack lets someone else falsely confirm/dispute on the real beneficiary's behalf.** Mitigation: same residual risk class as any SMS-OTP system (banking apps included) — worth naming honestly to judges as a known, industry-standard-level risk rather than claiming it away.

## Likely SIH judge questions and answers

**Q: "Isn't 'assisted reporting' just a CSC operator typing on someone's behalf — why does that need new engineering?"**
A: The submission side is simple. The hard, genuinely new part is the _closeout confirmation_ side: USP-07's entire trust model depends on the actual affected citizen — not an intermediary — deciding whether a fix is real. Removing the account requirement without breaking that guarantee is the actual design problem this USP solves, not just "let someone else fill the form."

**Q: "Why not just make the whole app work over SMS/USSD instead of building a web app with an assisted layer bolted on?"**
A: SMS/USSD alone can't carry photo evidence, before/after comparison sliders, or a public GIS-mapped ledger — the core trust and transparency mechanisms Samadhan is built around. The right design is layered access (web/PWA for connected users, assisted/CSC for the rest), not one channel replacing the other, which matches the research's own recommendation of "app + web + WhatsApp + SMS + voice/IVR + CSC-assisted" as complementary layers, not alternatives.

**Q: "What stops a CSC operator from just... not helping someone, or charging them for a free government service?"**
A: That's an operational/governance risk of the CSC network generally, not something a software layer can fully solve — but it's not a new risk Samadhan introduces (CSCs already handle other government services under existing oversight), and Samadhan's own audit trail (`submittedByUid` on every assisted report) makes any specific operator's assisted-submission pattern visible to an admin for the first time, which is more accountability than the status quo, not less.
