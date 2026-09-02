# USP-11 — Community Corroboration & Automated Escalation Accountability

**Status:** Not implemented. This document is a design/planning spec.

## Real-world problem

Samadhan currently has two separate, disconnected pieces relevant to this USP, both verified against the live code in this session:

1. **No independent verification before a report enters the pipeline.** `submitChallenge()` in `client/src/lib/db.ts` accepts any signed-in citizen's report at face value (beyond the existing AI auto-categorization and title-based duplicate check, which check *plausibility* and *duplication*, not *truthfulness*). There is no mechanism for other citizens who live near the reported location to corroborate ("yes, this pothole is real, I drive past it daily") or contest ("this was already fixed weeks ago") a report before institutions spend effort on it.
2. **Bottleneck detection is purely a display, not an action.** `AdminReports.tsx` (USP-05, verified implemented) computes and shows a "Bottleneck Alerts" banner for challenges stuck `>14 days` in `submitted`/`under_review` status — but as verified in this session, this is read-only: it tells an admin who happens to visit `/admin/reports` that a problem exists. Nothing notifies anyone automatically, nothing escalates to a higher authority, and there is no public-facing record of *which* institution or admin let a challenge stall. The accountability loop stops at "an admin could theoretically look at a chart."

## Research/evidence behind the problem

- `research/22.pdf` §22.1 (verified, read in this session): Ushahidi/Uchaguzi's verification workflow "checks reports using multiple sources, supporting photos/videos, duplicate checking and location verification; uncertain reports can remain unverified until further evidence is available" — a **human-in-the-loop, multi-source verification layer**, explicitly recommended as applicable: *"SAMADHAN can use a human-in-the-loop verification layer before forwarding a citizen problem to a university, government body or industry partner."* Samadhan, as verified, currently has no such layer — it has AI-based duplicate/category checks, not community corroboration.
- `research/22.pdf` §23.3 (verified): CPGRAMS explicitly categorizes pending grievances by ageing period (0-60, 60-180, 180-365 days, over one year) specifically to identify projects that are "stuck" and "trigger escalation or intervention." Samadhan's existing `>14 days` bottleneck detection borrows the *aging* concept from this precedent but — as verified — stops short of the *escalation* half CPGRAMS itself does.
- `research/22.pdf` §23.5 (verified): DARPG has explicitly stated that "disposal rate alone is not sufficient to measure the quality of grievance redressal" — supporting the case that a passive dashboard number is not the same as genuine accountability.
- `research/SAMADHAN_Research_Points_11-20.docx` §20.1 (verified): a real Ministry of Defence + IIT Kanpur precedent used AI to identify **repeat/spam complaints** even without expected keywords — a related but distinct mechanism to community corroboration, cited here as evidence that complaint-quality signals beyond simple duplicate-title matching are an established government AI use case.

## Who is affected

- Citizens whose genuinely urgent reports get no faster treatment than a low-priority one, because nothing in the current pipeline distinguishes "one person reported this" from "forty people confirm this is a real, ongoing problem."
- Citizens whose reports are quietly ignored past the 14-day mark — currently invisible to them; they have no way to know their report even triggered a bottleneck flag, since that banner is admin-only.
- Institutions that stall on a project with no consequence beyond an admin dashboard number nobody may be looking at that week.
- The state department itself, which — per the problem statement's own call for "dashboards and analytics for government departments to monitor... project progress" — needs escalation, not just monitoring, to actually be useful for oversight.

## Why existing systems fail

CPGRAMS ages and categorizes pending grievances (as cited above) but is a single-department, single-resolver system — escalation there means "push harder within the same department." Samadhan's citizen→university→industry structure is more complex (a stalled challenge might be stuck at "no institution has enrolled yet," "an institution enrolled but hasn't accepted," or "a project started but stopped moving") and none of the reference systems researched (CPGRAMS, MyGov, FixMyStreet, Ushahidi) have this specific three-actor structure to escalate across. Samadhan's own current bottleneck banner (verified, USP-05) is a good first step but stops at *detection*, not *action* — which is exactly the CPGRAMS-vs-DARPG distinction the research itself draws (disposal-rate/aging metrics alone aren't sufficient; DARPG calls for actual responsiveness).

## Proposed Samadhan solution

Two connected mechanisms — corroboration feeds a better priority signal *in*, escalation acts on a stalled report *out*:

1. **Community corroboration.** Reusing the existing `challengeSupports` collection and upvote mechanism (verified implemented, USP-05-adjacent — `db.upvoteChallenge()` already does a transactional, duplicate-safe upvote), extend it with a lightweight, structured corroboration signal beyond a plain upvote: a nearby citizen (matched by same district, or — if precise geolocation is available — within a small radius of the reported pin) can tag a report `"I've seen this too"` or `"This looks already resolved"` alongside the existing upvote/follow kinds already in that collection's shape. This is not a new data model — it's a third `kind` value (`"corroborate"` / `"dispute"`) alongside the existing `"upvote"`/`"follow"`, following the exact pattern the project architecture notes document as "deliberately only one support data model."
2. **Automated, staged escalation.** The existing `>14 days` bottleneck computation (USP-05's `computeDistrictStats`) becomes the trigger for a real notification chain, using the existing `createNotification()` side-effect pattern already used throughout `db.ts`: at day 14, notify the assigned institution's contact and the admin (today's behavior, but as an actual notification, not just a dashboard number); at day 30 with no status change, notify a second-tier "district escalation" recipient (configurable per admin — e.g., a designated department liaison); and record every escalation event as a durable, publicly visible entry on that specific challenge's Impact Timeline ("Escalated — no institution response after 14 days"), so the *stall itself* becomes part of the public accountability record USP-07 already builds for outcomes.

## How it works (realistic example)

Fifteen residents of a Ranchi ward independently see and corroborate a citizen's report of a broken streetlight over the following week — the report's corroboration count visibly outpaces a lone, unconfirmed report elsewhere, giving both citizens browsing `/challenges` and institutions browsing `/institute/challenges` (via USP-08's fit-ranking, if built, or simply a "most corroborated" sort otherwise) a genuine signal that this one matters to more people, without any institution or admin having to personally judge urgency. Meanwhile, a separate water-supply report in Latehar sits with no institution enrollment for 14 days; the assigned district liaison gets an automatic notification, and the challenge's own public Impact Timeline gains a visible "Escalated — no response after 14 days" entry, which any citizen (or journalist, or opposition politician, or judge evaluating the platform) can see directly on the public page, not buried in an admin-only dashboard.

## What makes this genuinely different

Samadhan already has upvoting (a simple "I care about this" signal) and a private admin bottleneck dashboard (a "someone should look at this" signal). USP-11 is not either of those renamed — it's (a) a *distinct-purpose* corroboration signal that also lets citizens flag a report as stale/already-fixed (which upvoting cannot do), feeding real priority information rather than raw popularity, and (b) turning a passive internal dashboard into an *actual notification chain with a public consequence*, which is the missing "quality of resolution... not merely completed" accountability the research explicitly says CPGRAMS-style disposal-rate metrics alone don't provide.

## Impact

Makes stalling costly and visible instead of invisible — directly answers the "government accountability," "SLA failures," and "escalation" judge-attack categories named in this task's own brief, with a concrete mechanism rather than a promise.

## Why this qualifies as a USP

Real problem (verified: no corroboration signal exists beyond a simple upvote; bottleneck detection is display-only with no action) → specific mechanism (structured corroboration `kind` extending the existing support model; staged notification escalation writing to the same public timeline USP-07 already builds) → measurable impact (stall duration becomes a public, not just admin-internal, fact) → clear differentiation (closes the exact "disposal rate isn't enough" gap the research explicitly cites DARPG raising against CPGRAMS-style systems, applied to Samadhan's own multi-actor pipeline).

## Technical approach

- `challengeSupports` gains `kind: "corroborate" | "dispute"` alongside the existing `"upvote" | "follow"` — same collection, same transactional-or-plain-duplicate-check pattern already used (corroboration doesn't need a live counter the way `upvoteCount` does, so it can use the simpler `supportChallenge()` read-then-write path already documented for non-counted kinds, rather than needing a new transaction).
- Escalation logic is a pure function extending `client/src/lib/analytics.ts`'s existing `computeDistrictStats`/bottleneck computation, run client-side whenever an admin (or a scheduled check, see Scalability below) loads the relevant view, calling the existing `createNotification()` helper for any newly-crossed threshold.
- New Impact Timeline event type in `ChallengeDetail.tsx`'s `ImpactTimeline` (verified implemented, rank-based current-status system) — an "escalated" event slots in at its own rank between "accepted" and "outcome submitted," following the exact pattern already documented for how that component derives state from workflow fields, not raw timestamps.

## Integration with the existing system

- No new page — corroboration UI is a small addition next to the existing upvote button on `Challenges.tsx`/`ChallengeDetail.tsx`; escalation surfaces on the existing `AdminReports.tsx` bottleneck banner (now with a "notified" state) and on the existing public `ImpactTimeline`.
- Notification delivery reuses the exact `notifications` collection and `recipientEmail`-scoped rules already in place — no new rules surface needed for in-app notifications. (An SMS/email delivery channel for escalation notifications, if wanted beyond in-app, has the same server-dependency caveat as USP-09's SMS OTP — not free, not purely client+Firestore.)

## Accessibility/inclusivity considerations

Corroboration buttons should use the same plain-language, icon-forward pattern as the existing upvote button (not requiring literacy beyond recognizing an icon), and go through the existing live-translate layer.

## Government adoption considerations

A staged, escalating-visibility notification chain is a much easier institutional sell than a single "shame the institution publicly immediately" mechanism — the first 14-day threshold stays internal (institution + admin notified, matching current behavior), and only the public timeline entry at the second threshold makes the stall visible externally, giving an institution/department a fair internal window to respond before any public accountability consequence appears. This staged design should be presented to a government evaluator explicitly as "notify first, expose second" — not as a punitive system from day one.

## Scalability considerations

Client-side-triggered escalation checks (running whenever `AdminReports.tsx` loads) mean escalation can be delayed if no admin visits the dashboard for a while — acceptable for a hackathon-scale pilot but not a real production guarantee. The correct production version needs a real scheduled job (a Cloudflare Worker cron trigger, consistent with the existing Cloudflare deployment target) to check thresholds on a fixed schedule regardless of whether anyone is looking at the dashboard — this is called out honestly as a gap in the client-only version, not glossed over.

## Abuse/failure cases and mitigation

- **Failure case: coordinated fake corroboration (a group falsely inflating a report's apparent community support, or falsely disputing a legitimate report as "already fixed" to suppress it).** Mitigation: corroboration/dispute counts are a *priority signal*, not a gate — they influence sort order and visibility, they don't auto-resolve or auto-reject anything; the same duplicate-account/spam risk applies here as to upvoting generally and isn't meaningfully worse.
- **Failure case: escalation notification chain becomes spam noise if thresholds are too aggressive, causing recipients to tune it out.** Mitigation: staged thresholds (14-day internal, 30-day external) specifically to keep the signal meaningful; threshold values should be admin-configurable per deployment rather than hardcoded, since "14 days" may not be the right SLA for every domain (a safety hazard vs. a slow-moving research project have very different reasonable timelines).
- **Failure case: an institution disputes that a "stalled" flag is fair (e.g., they were waiting on a citizen's response, not actually inactive).** Mitigation: the escalation event on the public timeline should be worded factually ("no status change recorded for 14 days"), not accusatory, and an institution should have a way to log a reason/update that resets or annotates the clock — this is a real design detail to get right and is flagged here rather than assumed away.

## Likely SIH judge questions and answers

**Q: "Isn't this just your existing GIS bottleneck banner with extra steps?"**
A: The bottleneck banner (USP-05) is read-only and admin-only. USP-11 turns the same underlying age computation into an actual notification chain with a public consequence — the mechanism (detection) already existed; the action (escalation) genuinely did not, and per the research's own DARPG citation, detection-without-action ("disposal rate alone") is explicitly documented as insufficient.

**Q: "How do you stop this from becoming a name-and-shame system that discourages institutions from participating at all?"**
A: The staged design is deliberate — internal notification first, public visibility only after a second, longer threshold, and factual (not accusatory) public wording. This is explained in the Government adoption section and should be stated to judges as a considered tradeoff, not an oversight.

**Q: "What's stopping fake corroboration from gaming priority?"**
A: Corroboration only affects sort/visibility signals, never automatically resolves, assigns, or rejects a report — the actual pipeline (verification, assignment, closeout) is unaffected by corroboration count, which limits the blast radius of gaming it to "this report shows up higher in a list," not "this report gets falsely resolved or falsely killed."
