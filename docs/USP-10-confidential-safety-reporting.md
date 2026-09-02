# USP-10 — Confidential & Safety-Aware Reporting

**Status:** Not implemented. This document is a design/planning spec.

## Real-world problem

As verified against the actual codebase in this session, every challenge Samadhan stores carries `citizenEmail` (and, if USP-09 above were built, potentially `beneficiaryName`/`beneficiaryPhone` too), and that identity is **not private** — `docs/CLAUDE.md`'s own documentation of the data model confirms `challenges` is a world-readable Firestore collection (`firestore.rules`: "challenges — world-readable"), and `ChallengeDetail.tsx` renders a "Submitted by" byline publicly. This is a deliberate, reasonable design for the ordinary case (a pothole report benefits from public accountability), but it means **there is currently no way to report a problem that involves personal risk without also publicly exposing the reporter**. A citizen who wants to report, say, a corrupt local official demanding bribes for a service, an unsafe/exploitative situation at a workplace, or a safety hazard tied to a powerful local interest, has to either use their real, publicly-linked identity or not report at all.

## Research/evidence behind the problem

- The team's own research brief (per the task instructions given for this session) explicitly names "sensitive complaints," "anonymous/confidential reporting where appropriate," and "citizen safety" as real-world gap categories judges are likely to probe — and, having read all three research files and `RESEARCH_ANALYSIS.md` end to end in this session, **none of the three research documents nor `RESEARCH_ANALYSIS.md` actually researched or cited a specific precedent for confidential/anonymous civic-grievance reporting.** This is being flagged honestly rather than invented: the *problem* is well-established generally (whistleblower protection is a well-known public-policy concept), but no specific citation for it exists in this project's own research corpus, so the "why existing systems fail" section below is reasoned from the verified absence of any privacy tier in Samadhan's current data model, not from a research citation.
- `research/22.pdf` §26 (verified, read in this session) covers the Digital Personal Data Protection Act 2023 and DPDP Rules 2025 in general terms — "location data should be collected only when required," "data minimisation," "purpose-based access control" — which is a *privacy-by-design* mandate under Indian law, and a platform that publishes every reporter's identity and exact location by default for every complaint type is in tension with that mandate for any complaint where the reporter's safety is a factor.
- The Digital Personal Data Protection Act, 2023 itself (cited in the research, verified above) establishes individuals' rights over their personal data as a matter of Indian law — this is the actual legal grounding for the feature, distinct from any civic-tech precedent.

## Who is affected

- Citizens reporting problems that implicate a powerful local actor (corruption, land disputes, exploitation) where public identification could invite retaliation.
- Citizens reporting safety/domestic issues that are civic-adjacent (e.g., an unsafe or exploitative workplace tied to a specific employer, harassment at a public facility) who would not report at all under full public attribution.
- Women and other vulnerable-group reporters in contexts where a public byline next to a home district/location is itself a safety signal.

## Why existing systems fail

CPGRAMS grievances are tied to the citizen's identity for tracking/appeal purposes and are not designed as a public social-accountability ledger the way Samadhan deliberately is — so CPGRAMS doesn't have this specific problem, but it also doesn't have Samadhan's public-transparency benefits either. Samadhan's specific design choice — public "Submitted by" bylines, a public Impact Timeline, an admin-visible-but-not-anonymous everything — is precisely what makes public accountability work for ordinary civic problems (a pothole, a broken pump) and precisely what makes it unsafe for the sensitive minority of reports. Neither "fully public" nor "fully anonymous" is the right answer for *every* report; the platform needs both modes to coexist.

## Proposed Samadhan solution

A **per-report visibility tier**, chosen by the citizen at submission time, not a platform-wide anonymity toggle:

1. **Public (default, unchanged)** — today's behavior: full `citizenEmail`/byline visible, full public Impact Timeline, exactly as currently implemented.
2. **Restricted** — the report is still routed, verified, assigned, and worked exactly as normal (institutions/admins see the real reporter identity, because someone has to be able to follow up and the report must still be accountable *internally*), but the **public-facing** `ChallengeDetail.tsx` page and any public GIS/ledger view omit the "Submitted by" byline and blur/generalize the exact pin to the district level (consistent with the DPDP-aligned "approximate location for public display, exact only for authorized users" pattern the research itself recommends, §26.4, verified).
3. **Confidential/escalation-only** — for the smallest, highest-risk category (e.g., safety threats implicating a local authority figure), the report bypasses the normal institution self-enrollment/browse flow entirely and routes directly to a small, named admin-reviewer set only, never appearing in any public or institution-browsable list, with the reporter's identity restricted to that admin set and never shown to any institution.

## How it works (realistic example)

A citizen wants to report that a local contractor is demanding informal payments to release a completed water-connection application — a real civic problem (public-service delivery failure/corruption) but one where the citizen reasonably fears the contractor recognizing their name and district in a public post. They choose "Restricted" at submission. The report still enters the normal challenge pipeline — an institution can still self-enroll to investigate and a project can still form — but `ChallengeDetail.tsx`'s public page shows "Reported by a verified citizen" instead of a name, and the location shown publicly is the district centroid, not the exact pin. Internally, admins and the assigned institution still see the real identity and exact location, because resolving the actual problem requires it — only the *public* surface is restricted.

## What makes this genuinely different

This is not "add an anonymous-reporting checkbox" as a bolt-on — it's a **tiered visibility model layered onto the existing pipeline**, deliberately preserving Samadhan's actual differentiator (the public Impact Timeline, the hash-anchored ledger, USP-07's citizen-confirms-resolution loop) for the sensitive tiers too, just with the reporter's identity and precise location narrowed rather than the whole trust mechanism being dropped. A simpler "just let people report anonymously" design would break USP-07 entirely (an anonymous report can't have its closeout confirmed by "the citizen who reported it," because nobody would know who that is) — this design keeps the internal identity intact specifically so the confirmation loop still works, and only narrows the *public* surface.

## Impact

Extends Samadhan's reach to the class of civic problems — often the ones with the most real accountability value, like low-level corruption in service delivery — that a fully-public-by-default platform structurally discourages people from reporting at all.

## Why this qualifies as a USP

Real problem (verified structural gap: every report is publicly attributable today, with no tier) → specific mechanism (three-tier visibility, not a blanket anonymity switch, preserving the internal accountability and citizen-confirmation loop) → measurable impact (unlocks a category of reports — corruption/safety-adjacent — currently self-censored) → clear differentiation (no other civic-tech reference researched in this project's own materials implements tiered visibility; most either publish everything or anonymize everything).

## Technical approach

- `challenges` document gains an optional `visibilityTier?: "public" | "restricted" | "confidential"` field (defaults to `"public"` for all existing records via the same `omitUndefined()`/optional-field convention already used throughout `db.ts`).
- `firestore.rules` needs new, carefully scoped read rules: the existing `challenges` collection is currently flat `allow read: if true`. Splitting this by `visibilityTier` **cannot** be done with a single collection-wide boolean rule anymore — a `confidential` document must deny read to everyone except `isAdmin()` and the report's own `citizenEmail`/owner, while `public`/`restricted` stay world-readable (with the *client* responsible for not rendering the byline/exact-location fields for `restricted` — Firestore rules can't selectively hide individual fields within an otherwise-readable document, so `restricted`'s privacy is a client-rendering convention, not a server-enforced guarantee, which must be stated honestly, see below).
- This is the most rules-sensitive USP in this document — it changes the security boundary of an existing, currently-fully-open collection, and per the project's own standing caution ("`firestore.rules` is the entire security model... any loosened rule is directly exploitable"), the reverse risk (an *over-tightened* or buggy rule) also needs the same care the project already gives to testing rules changes (`tests/firestore.rules.test.ts`).

## Integration with the existing system

- `SubmitChallenge.tsx` gains a visibility-tier selector (with plain-language, non-technical labels — "Everyone can see this" / "Your name is hidden from the public page" / "Only Samadhan admins see this") near the existing domain/district fields.
- `ChallengeDetail.tsx`'s existing byline and `InstitutionStatusPanel` rendering logic branch on `visibilityTier` to omit/generalize identity and location fields for `restricted`, and the page doesn't render at all for non-admin/non-owner viewers of `confidential`.
- USP-07's `CitizenCloseoutConfirm.tsx` confirmation flow is **unchanged** for `restricted`/`confidential` reports — the actual reporter still confirms/disputes exactly as today, since their identity is never hidden from the system, only from the public page.
- The GIS Command Center (USP-05) should aggregate `confidential` reports into district-level counts only (no pin-level marker), consistent with the "approximate for public display" principle.

## Accessibility/inclusivity considerations

The tier selector must be understandable without legal/technical vocabulary — plain-language labels as above, not "PII visibility scope." This should go through the same Bhasha & Bol / live-translate coverage as the rest of the submission form so a citizen choosing this doesn't have to read English legal-style copy to protect themselves.

## Government adoption considerations

A government stakeholder evaluating this should be told plainly that `confidential`-tier reports (implicating an official) create a real institutional-accountability question: who has authority to see and act on a report alleging misconduct by a local official, and how is *that* admin access itself audited? This needs an actual governance answer (e.g., routing confidential reports to a specific named oversight body, not "any admin") before a real deployment — this document does not invent that governance structure, since it depends on decisions outside Samadhan's own scope (which state body has authority over such complaints), and should be flagged to judges as an open policy question rather than glossed over.

## Scalability considerations

No new infrastructure beyond the rules change and a client-side rendering branch — scales the same as the rest of the read-heavy Firestore architecture.

## Abuse/failure cases and mitigation

- **Failure case: `restricted` tier's privacy is a client-side rendering convention, not a hard server-enforced guarantee (see Technical approach above) — a technically sophisticated bad actor could query Firestore directly (the same way `tests/firestore.rules.test.ts` does, over the REST API) and see the raw `citizenEmail`/location fields even though the normal UI hides them.** Mitigation: this is a real, honest limitation to state to judges rather than hide — the actual fix is moving `citizenEmail`/exact-location out of the world-readable `challenges` document entirely for `restricted`/`confidential` tiers into a separate collection with real per-field rules-level access control (mirroring how `notifications`/`challengeSupports` are already scoped by owner in the current rules), which is more engineering than a first pass but is the architecturally correct version of this feature and should be the actual target, not the field-level client-hiding described as the simpler starting point above.
- **Failure case: someone abuses `confidential` tier to make bad-faith, unverifiable allegations with no public accountability trail at all.** Mitigation: `confidential` reports still keep the full internal audit trail (admin sees real identity, hash-anchored activity log per USP-03 still applies) — the *public* is the only party kept blind, not the platform itself, so misuse is still traceable and actionable by admins even though it's not publicly visible.
- **Failure case: over-broad admin access to `confidential` reports defeats the purpose (if "any admin" can see a corruption report naming an official who happens to know an admin).** Mitigation: flagged explicitly above under Government adoption — this needs a real governance decision (a restricted admin sub-role, an external oversight routing), not a purely technical fix, and should not be oversold as solved.

## Likely SIH judge questions and answers

**Q: "Doesn't hiding the reporter's identity undermine your whole 'public accountability ledger' pitch?"**
A: Only for the specific reports where the reporter has a real safety reason to need that — which is a minority, and exactly the design principle: public-by-default (unchanged) for the vast majority of civic problems where accountability benefits from visibility, with an opt-in narrower tier for the cases where public visibility would suppress reporting entirely. A platform that can't handle both isn't ready for the full range of things the problem statement asks it to cover.

**Q: "Is this actually anonymous, or can it be de-anonymized?"**
A: We're explicit that `restricted` is not cryptographically anonymous — it hides the identity from the *public UI*, not from the platform or from anyone querying Firestore directly (a known, stated limitation above). True field-level access control is the correct target architecture and is called out as such, not claimed as already solved.

**Q: "What stops this from becoming a way to make unverified accusations with no consequence?"**
A: The report still goes through the same verification/assignment/closeout pipeline as any other challenge — visibility tier controls who can *see* it, not whether it's investigated, and the internal audit trail (real identity, hash-anchored activity log) is preserved for every tier, so "no public visibility" does not mean "no accountability," it means the accountability trail is internal rather than public for that specific report.
