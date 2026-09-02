# USP-08 — Intelligent Problem-to-Institution Matching & Routing Engine

**Status:** Not implemented. This document is a design/planning spec (like USP-04/USP-06 originally were), not an implementation record.

## Real-world problem

The SIH 2026 problem statement (ID 26043) does not just ask for a citizen-reporting portal. Its "Expected Solution" section explicitly calls for:

> "An AI-enabled problem management module capable of automatically categorizing, prioritizing, deduplication, **and routing validated challenges to appropriate universities based on subject expertise and institutional capabilities**."

and the background section calls for:

> "Routing validated problem statements to appropriate universities based on their **academic disciplines, research expertise, innovation centres, incubation facilities, and faculty specialization**."

This is not an optional nice-to-have — it is named, specifically, in the official problem statement Samadhan is being built for. **As verified against the actual codebase in this session, Samadhan does not do this today.** `client/src/lib/db.ts`'s `assignChallenge()` (admin manually picks one verified institution) and `enrollChallenge()` (an institution self-enrolls for any open challenge it chooses) are the only two paths a challenge reaches an institution. Neither looks at what the institution is actually good at. An institution can self-enroll for a challenge completely outside its expertise (a pure-arts college enrolling for a groundwater-engineering challenge), and admin assignment is a human manually eyeballing a list with no decision support.

## Research/evidence behind the problem

- `research/22.pdf` §33.1 (verified directly from the PDF in this session): NITI Aayog's *Establishing New Universities in India* analysis found **Ranchi has 18 universities while several of Jharkhand's Aspirational Districts have zero**. Academic capacity is not just "insufficient" — it is geographically lopsided. A citizen's own district frequently has no institution capable of taking their problem at all.
- `docs/RESEARCH_ANALYSIS.md` §1.2 draws the same conclusion independently: "Jharkhand's Actual Problem Is Routing, Not Data."
- The `organizations` table (`drizzle/schema.ts:38-39, 83-85`) already has **`departments` and `expertise` free-text fields**, collected at institution onboarding — verified directly in the schema file during this session. They are stored but, as of this session, **read by nothing** in `db.ts`, `enrollChallenge()`, or `assignChallenge()`. The data the matching engine needs already exists in the database; it is simply never used for a match.

## Who is affected

- **Citizens in Aspirational Districts with zero local universities** (per the NITI Aayog finding above) — their reports currently rely entirely on an institution somewhere else in the state noticing and choosing to self-enroll, or an admin manually noticing the gap.
- **Admins**, who currently have no decision support when using `assignChallenge()` — they either already know every institution's specialization from memory, or they're guessing.
- **Institutions themselves**, who currently browse an undifferentiated list of "Available challenges" (`InstituteChallenges.tsx`) with no signal for which ones actually fit their department/faculty strengths, wasting review time and risking a mismatched self-enrollment that stalls later (a civil-engineering problem picked up by a college with no civil faculty).

## Why existing systems fail

CPGRAMS and MyGov route grievances to a *department*, not to a specific institution with matching subject-matter capability — there is no equivalent concept in a generic government grievance system, because they don't involve universities at all. UMANG aggregates services; it doesn't match a problem to a solver. FixMyStreet routes by category to whichever single council owns that road — a 1:1 geographic mapping, not a many-to-many expertise match. None of the reference systems researched actually solve "which of N eligible organizations is the best fit for this specific problem," because none of them have Samadhan's citizen→university structure at all.

## Proposed Samadhan solution

A **match-score engine**, computed entirely client-side (no new backend — consistent with the rest of Samadhan's architecture) from data that already exists in Firestore:

1. **Institution profile signal** — the existing `organizations.departments` / `organizations.expertise` free-text fields, tokenized into a keyword set at read time (no schema change needed to start; a structured multi-select tag field is a fast-follow improvement, see below).
2. **Challenge domain signal** — the existing `challenges.domain` field (`Water | Education | Health | Agriculture | Infrastructure | Livelihoods`, per `SubmitChallenge.tsx`'s dropdown) plus the free-text `description`.
3. **Geographic proximity signal** — `challenge.district` vs. the institution's registered district/location, using the same `JHARKHAND_DISTRICTS` centroid data `InteractiveMap.tsx`/`AdminReports.tsx` already use for GIS, so a nearer institution scores higher than a distant one, all else equal.
4. **Capacity/load signal** — how many `assignments`/`projects` an institution already has active (from the same `assignments` collection the self-enrollment flow already reads), so an overloaded institution scores lower and a match doesn't pile every good-fit challenge onto one popular college.

These four signals combine into a **match score per (challenge, verified institution) pair**, surfaced two ways, neither of which removes human judgment:

- **On `InstituteChallenges.tsx`'s "Available challenges" list**, a per-card "Fit for your institution" badge/percentage, sorted by fit instead of chronological order — so an institution's own faculty spend their limited attention on the challenges most likely to be a good match, without losing the ability to self-enroll for anything else.
- **On `AdminChallengeReview.tsx`-equivalent admin assignment screens**, a ranked list of "Suggested institutions" for a given unassigned challenge, replacing the current blind manual pick — admin still clicks the final "Assign" button, this only orders and annotates the choice.

## How it works (realistic example)

A citizen in Latehar (a NITI Aayog Aspirational District with no local university, per the verified research finding above) reports a groundwater-contamination problem, domain `Water`. Today: the report sits until some institution happens to notice it in the open list, or an admin manually remembers which of the state's ~9 universities has a water/civil/environmental engineering department. With USP-08: the moment the challenge is validated, the engine scores every verified institution — BIT Mesra's civil engineering department and expertise keywords ("water", "environmental") score high even though BIT Mesra is in Ranchi, not Latehar, because domain-fit outweighs raw distance once a threshold is met; a nearby college with an unrelated speciality (say, a purely commerce-focused institution) scores low despite being geographically closer. The admin's assignment screen now shows BIT Mesra at the top with a "Water · Civil/Environmental Engineering match" tag instead of an alphabetical list, and BIT Mesra's own "Available challenges" view shows this Latehar report near the top of its own feed too.

## What makes this genuinely different

This is not "yet another AI classification feature" layered on for its own sake — Samadhan already has AI classification (Groq Vision auto-categorize, per `docs/CLAUDE.md`'s "AI Auto-Categorize" section, verified implemented in this session) and duplicate detection. USP-08 solves a **different, more specific problem named explicitly in the actual SIH problem statement**: not "what domain is this" but "which specific verified organization, out of all the ones on the platform, is the right one to solve it." No existing civic-tech reference platform researched (CPGRAMS, MyGov, UMANG, FixMyStreet, Ushahidi) has an equivalent many-to-many expertise-matching mechanism, because none of them route to specialized third-party solver organizations at all — they route to a single fixed government department. Samadhan's own current implementation (self-enrollment + manual admin assignment, both verified against the live code in this session) also does not do this — it's a real, current gap, not a renamed existing feature.

## Impact

- Directly closes a requirement stated in the problem statement itself — the single most judge-defensible reason to build this, since a judge reading the problem statement will notice the routing requirement immediately if it isn't there.
- Turns the already-collected-but-unused `organizations.departments`/`expertise` fields into an actual product feature instead of dead data.
- Specifically helps citizens in the Aspirational Districts the research flagged as having zero local university capacity, by surfacing the right *distant* institution instead of relying on chance discovery.

## Why this qualifies as a USP

Real problem (explicit PS requirement, unaddressed as of this session) → specific mechanism (four-signal match score over already-collected data, computed client-side, no new backend) → measurable impact (faster time-to-enrollment for well-matched challenges, fewer mismatched self-enrollments that stall later) → clear differentiation (no reference system researched routes many-to-many by expertise; Samadhan's own current implementation doesn't either).

## Technical approach

- New pure function module `client/src/lib/matching.ts` (no Firestore calls of its own — takes already-fetched `challenges`/`organizations`/`assignments` arrays, mirroring the existing pattern in `client/src/lib/analytics.ts` for USP-05): `scoreInstitutionsForChallenge(challenge, organizations, assignments): { organizationId, score, reasons }[]`.
- Domain/keyword matching starts as simple token overlap between `challenge.domain`/`description` and `organization.departments`/`expertise` (same class of heuristic already used and shipped in `client/src/lib/bhasha.ts`'s `DOMAIN_KEYWORDS` and `duplicateCheck.ts`'s word-overlap similarity — consistent with the project's existing "naive heuristic, no paid AI call" pattern rather than introducing a new dependency).
- Geographic distance reuses the district centroid table already present for `InteractiveMap`/`AdminReports` (`JHARKHAND_DISTRICTS`) — no new geodata needed.
- No `firestore.rules` change required — this only reads already-world-readable `organizations`/`challenges`/`assignments` collections; it doesn't need to write anything new (the ranked list is a client-side computed view, not a stored field), so the two-step "client deploy + rules deploy" split isn't triggered.
- Fast-follow, not required for v1: replace `organizations.expertise` free text with a structured multi-select tag field (chosen from a fixed vocabulary at institution onboarding/profile edit) for a more reliable match than free-text token overlap — this is a schema-compatible additive change (`drizzle/schema.ts` is schemaless in Firestore already; old free-text-only org records simply have no tags and fall back to the free-text heuristic).

## Integration with the existing system

- Renders on `InstituteChallenges.tsx` (existing "Available challenges" section, USP self-enrollment feature) as a sort key and badge — no new route.
- Renders on the existing admin challenge-assignment surface as a ranked "Suggested institutions" panel above the current plain organization picker.
- Does not change `enrollChallenge()`/`assignChallenge()` themselves — self-enrollment stays open to any verified institution for any challenge (institutions can still legitimately want to pick up something outside their core department), and admin still makes the final call. The engine is a **ranking and surfacing layer**, not a gatekeeper — this deliberately avoids the failure mode of an opaque auto-router silently blocking a legitimate cross-disciplinary match.

## Accessibility/inclusivity considerations

Purely an institution/admin-side feature — no citizen-facing UI, so no new literacy/language/connectivity burden on the reporting citizen. The badge/ranking text should still go through the existing i18n/live-translate layer (`AutoTranslate.tsx`) for institution users who prefer Hindi.

## Government adoption considerations

Directly supports the research-cited Jharkhand Startup Policy 2021 / IIT Madras–Jharkhand University of Technology partnership pattern (`research/22.pdf` §33.2, verified) of connecting existing institutional capability to real problems rather than creating new institutions — the pitch to a government stakeholder is "we route to your existing university network intelligently," not "we require new infrastructure."

## Scalability considerations

Purely client-side computation over already-fetched collections scales the same way the rest of Samadhan's read-heavy client architecture does — no new server, no new Firestore reads beyond what `InstituteChallenges.tsx`/admin pages already fetch. At larger institution counts (hundreds instead of the current handful of seeded/onboarded orgs), the O(challenges × organizations) score computation is still cheap in-browser for realistic Jharkhand-scale numbers (9 universities + 246 colleges per the research's own verified count), but would need a cap/pagination if the platform scaled to multi-state.

## Abuse/failure cases and mitigation

- **Failure case: free-text `expertise` field is empty or vague for an institution that never filled it in carefully.** Mitigation: score falls back to domain-only + geographic proximity; a "no expertise data" institution isn't excluded, just unranked/lower-confidence, and its own profile page can nudge it to fill in `expertise` with a "complete your profile to appear in better matches" prompt.
- **Failure case: an institution "games" its `expertise` field with broad/irrelevant keywords to rank for everything and monopolize challenges.** Mitigation: the capacity/load signal already down-weights institutions with many active assignments, which naturally throttles a single institution from absorbing every challenge regardless of keyword-stuffing; this is a ranking signal an admin sees, not an automatic gate, so an admin noticing a suspicious pattern can still assign elsewhere.
- **Failure case: matching engine has systematic geographic bias (always prefers Ranchi-based institutions because they're best-resourced and best-profiled).** Mitigation: this is the exact problem the research flagged (18 vs 0 universities) — the design deliberately weights domain/keyword fit above raw distance past a reasonable radius, specifically so a well-matched distant institution can still outrank a poorly-matched nearby one; this tradeoff should be explicitly stated to judges as a design decision, not hidden.

## Likely SIH judge questions and answers

**Q: "Isn't this just your existing AI auto-categorization feature renamed?"**
A: No — auto-categorization (Groq Vision) answers "what domain is this challenge," which already exists and is unrelated. USP-08 answers a different question named explicitly in the problem statement: "which specific verified organization should solve it." They operate on different data (challenge photo vs. institution profile) and solve different steps of the pipeline.

**Q: "What if the AI recommends the wrong institution?"**
A: It doesn't decide — it ranks and suggests. `assignChallenge()` still requires an admin's explicit click, and `enrollChallenge()` remains open to any verified institution regardless of its rank. This is deliberately advisory, not automated, exactly because a wrong automated routing decision (e.g., for a sensitive or ambiguous problem) could be worse than the current manual process.

**Q: "How do you know your matching actually works, given you don't have real usage data yet?"**
A: We don't claim a validated accuracy number — that would be fabricated. The honest claim is: the four signals used (domain keyword overlap, geographic proximity, institution-stated expertise, current capacity) are the same signals the problem statement itself names ("academic disciplines, research expertise... faculty specialization"), and the mechanism is transparent/inspectable (each suggestion shows its reasons) rather than a black box, so an admin can sanity-check and override any suggestion trivially.
