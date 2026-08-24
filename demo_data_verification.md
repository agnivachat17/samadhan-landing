# Synthetic Demo-Data Verification

The `samadhan-demo-v1` Firestore generator was run twice with deterministic record IDs. It reported 50 synthetic citizen contacts, 8 synthetic institutions, 7 synthetic industries, 50 challenges, 20 projects, and 465 workflow records on both executions, confirming idempotent writes.

The populated portfolio, industry opportunity, administrator user registry, and governance audit routes were visually reviewed. The citizen record route `/citizen/challenges/730000` rendered the synthetic Water challenge. The institute closeout route `/institute/projects/750000/closeout` exposed the synthetic closeout record, the administrative route `/admin/projects/750000/closeout` rendered a confirmed-and-approved outcome, and the citizen route `/citizen/challenges/730000/closeout` rendered its synthetic outcome narrative and confirmation controls.

All records produced by this generator are clearly synthetic and intended solely for product demonstration.

Direct browser verification also confirmed that `/citizen/challenges/730000` rendered the seeded resolved Water challenge with its synthetic description, domain, and Ranchi district. The administrator closeout route `/admin/projects/750000/closeout` rendered the seeded outcome with citizen confirmation marked `confirmed` and administrative status marked `approved`.

The industry opportunity route rendered all 20 seeded delivery projects with their institute context and structured interest actions. The governance route rendered synthetic workflow metrics, including 12 challenges in review, one at-risk project, four closeouts awaiting a decision, and recent challenge, project, closeout, and organization audit events.

The notification center was loaded with the seeded citizen identity `demo.citizen.01@samadhan.demo` through browser session state before inspecting its persisted workflow notices.

The loaded notification center rendered two persisted synthetic notices for that citizen: the challenge receipt for “Demo Water challenge 01 — Ranchi” and the delivery handoff for “Demo delivery project 01 — Water”.
