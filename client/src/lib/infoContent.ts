/**
 * Static content for the /info/:slug pages linked from the site footer.
 * Kept as one data file (rather than one file per page) so the ~15 lightweight
 * footer destinations share a single template component (InfoPage.tsx) instead
 * of duplicating layout/markup - see CLAUDE.md's page-component conventions.
 */

export type InfoSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

export type InfoContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoSection[];
  cta?: { label: string; href: string };
  /**
   * Renders a "Reach us directly" block sourced from client/src/lib/siteContact.ts.
   * Only set on pages where a direct channel is actually relevant (contact-us,
   * support) - the block itself stays hidden until siteContact's fields are
   * filled in, so this flag alone never causes a fake contact detail to appear.
   */
  showContactChannels?: boolean;
};

export const infoContent: Record<string, InfoContent> = {
  "how-it-works": {
    eyebrow: "The pipeline",
    title: "How Samadhan works.",
    intro:
      "Samadhan runs a single, transparent pipeline from a citizen's report to a verified, citizen-confirmed outcome — every step is visible to the public on the challenge's own page, not just to the people doing the work.",
    sections: [
      {
        heading: "1. A citizen reports a challenge",
        body: [
          "Anyone with an account can file a civic problem — water, health, safety, digital access, and more — with a location, description, and district. Reports can be filed offline in low-connectivity areas and synced automatically once back online, and filled in by voice or handwriting scan in Hindi or English.",
        ],
      },
      {
        heading: "2. An institution takes it on",
        body: [
          "A verified institution can self-enroll for an open challenge, or an admin can assign one directly based on academic fit. Both paths are equivalent from that point on — there is no advantage to waiting for an assignment.",
        ],
      },
      {
        heading: "3. The institution delivers a project",
        body: [
          "Once accepted, the institution runs the work as a project: milestones, team members, and supporting documents, optionally backed by an industry partner's funding or expertise.",
        ],
      },
      {
        heading: "4. The citizen — not an official — confirms the outcome",
        body: [
          "When the institution submits before/after evidence, the original reporter decides whether the problem is actually fixed. If not, the institution submits another round. There is no administrative sign-off step in between — resolution is citizen-decided by design.",
        ],
      },
      {
        heading: "5. Everything is hash-verifiable",
        body: [
          "Every project update is chained with a cryptographic hash, so the record can be checked for tampering by anyone, at any time, from the challenge's own public page.",
        ],
      },
    ],
    cta: { label: "Browse open challenges", href: "/challenges" },
  },

  "submit-solutions": {
    eyebrow: "For institutions",
    title: "Submitting a solution.",
    intro:
      "Delivering a project on Samadhan is the same whether your institution was assigned a challenge by an admin or enrolled for one yourselves.",
    sections: [
      {
        heading: "Pick a challenge",
        body: [
          "Browse the public challenge list or your institution's own queue. Challenges are ranked by fit against your institution's stated departments and expertise, so the strongest matches for your team surface first.",
        ],
      },
      {
        heading: "Accept and start the project",
        body: [
          "Accepting an assignment creates a project workspace: milestones, a team roster, and a document store for everything from survey data to final reports.",
        ],
      },
      {
        heading: "Record progress as you go",
        body: [
          "Activity entries build a running, hash-chained record of the work — useful both for your own team's coordination and as public proof of what was actually done.",
        ],
      },
      {
        heading: "Submit before/after evidence",
        body: [
          "When the work is complete, submit a closeout with before/after evidence. The citizen who filed the original report reviews it directly; if they say it isn't fixed yet, submit a fresh round rather than starting over.",
        ],
      },
    ],
    cta: { label: "View your challenge queue", href: "/institute/challenges" },
  },

  collaborate: {
    eyebrow: "For institutions",
    title: "Collaborating on a project.",
    intro:
      "A Samadhan project is rarely one person's work — the platform gives faculty, students, and industry partners distinct roles on the same delivery.",
    sections: [
      {
        heading: "Faculty and student accounts",
        body: [
          "An institution admin invites faculty and students by link; each lands on a workspace scoped to their own role. Students see and update the projects they're a team member on; faculty additionally see everything they mentor, with oversight of the whole team.",
        ],
      },
      {
        heading: "A per-project forum",
        body: [
          "Every project has its own discussion thread for coordination between team members and mentors — separate from the public-facing activity log.",
        ],
      },
      {
        heading: "Industry partners",
        body: [
          "A verified industry partner can back your project with funding, expertise, or CSR support once it's visible in the public project ledger — you don't need to seek them out directly.",
        ],
      },
      {
        heading: "Academic credit",
        body: [
          "Completed projects can be awarded credits, split across the team roster, with a verifiable certificate generated per contributor.",
        ],
      },
    ],
  },

  "resources-institutions": {
    eyebrow: "For institutions",
    title: "Resources for institutions.",
    intro: "A short list of things worth knowing before and during delivery.",
    sections: [
      {
        heading: "Get verified first",
        body: [
          "Only verified institutions can accept or self-enroll for challenges. Complete your organization profile — including departments and areas of expertise — right after applying; an admin reviews and verifies new applications.",
        ],
      },
      {
        heading: "A complete profile improves your matches",
        body: [
          "The challenge-routing engine scores fit using your stated departments, expertise, and location against each challenge's domain and district. An institution with a blank profile is shown last, not first.",
        ],
      },
      {
        heading: "Standing is separate from verification",
        body: [
          "Verification is a one-time gate; standing (active, warned, suspended, terminated) is ongoing moderation that can change at any time based on delivery quality. Both are visible on your organization's status screen.",
        ],
      },
    ],
  },

  "guidelines-institutions": {
    eyebrow: "For institutions",
    title: "Institution guidelines.",
    intro:
      "Standards that keep the public ledger trustworthy for the citizens relying on it.",
    sections: [
      {
        heading: "Evidence should be real and specific",
        body: [
          "Before/after evidence submitted at closeout is shown directly to the citizen who reported the problem, and stays on the public record afterward. Submit genuine photos and honest progress notes, not placeholder or unrelated material.",
        ],
      },
      {
        heading: "Respond to disputes, don't resubmit blindly",
        body: [
          "If a citizen disputes a closeout, their stated reason is shown to your team before you submit the next round — address that reason specifically rather than resubmitting the same evidence.",
        ],
      },
      {
        heading: "Self-enrollment is open, not exclusive",
        body: [
          "More than one institution can self-enroll on the same open challenge. Enrolling doesn't guarantee sole ownership of the work — check a challenge's current status before investing significant effort.",
        ],
      },
      {
        heading: "Consequences for delivery quality",
        body: [
          "Repeated poor-quality or inactive delivery can move your organization's standing to warned, suspended, or terminated by an admin, which blocks dashboard access independently of your verification status.",
        ],
      },
    ],
  },

  "identify-challenges": {
    eyebrow: "For industry",
    title: "Identifying challenges to back.",
    intro:
      "Industry partners don't need to wait for an introduction — every challenge and its delivery progress is public.",
    sections: [
      {
        heading: "Browse by domain and district",
        body: [
          "The public challenge list can be filtered by domain (water, health, agriculture, infrastructure, and more) and district, so you can find problems close to your operations or expertise.",
        ],
      },
      {
        heading: "See which are already in motion",
        body: [
          "A challenge's page shows its live status — reported, assigned, in delivery, or resolved — plus which institution is doing the work, so you can choose to back an active project rather than an unclaimed report.",
        ],
      },
      {
        heading: "Look at the district picture, not just one report",
        body: [
          "Admin-facing reporting surfaces district-level hotspots and bottlenecks across all open challenges, which is useful context if you're deciding where a CSR commitment would have the most effect.",
        ],
      },
    ],
    cta: { label: "See open challenges", href: "/challenges" },
  },

  "offer-solutions": {
    eyebrow: "For industry",
    title: "Offering support to a project.",
    intro:
      "Support from an industry partner is recorded as a distinct, visible commitment on the project it backs — funding, technical expertise, or CSR capacity, not an anonymous donation.",
    sections: [
      {
        heading: "Register your interest",
        body: [
          "From a project's page, register interest specifying what you're offering — funding, expertise, or CSR support — and it's routed to the institution leading the work.",
        ],
      },
      {
        heading: "Stay visible on the record",
        body: [
          "Your organization's involvement is shown alongside the project's progress, so the eventual outcome reflects the partnership rather than crediting the institution alone.",
        ],
      },
      {
        heading: "No obligation, no lock-in",
        body: [
          "Expressing interest starts a conversation with the institution — it isn't a binding commitment, and multiple industry partners can back the same project.",
        ],
      },
    ],
  },

  "impact-scale": {
    eyebrow: "For industry",
    title: "Impact & scale.",
    intro:
      "Every outcome on Samadhan is verifiable, which is what makes a CSR or funding commitment here easy to report on with confidence.",
    sections: [
      {
        heading: "A tamper-evident public ledger",
        body: [
          "Project activity and closeout evidence are chained with cryptographic hashes and can be independently re-verified by anyone from the challenge's own page — including your own team, without needing platform access.",
        ],
      },
      {
        heading: "Citizen-confirmed, not self-reported",
        body: [
          "A project only counts as resolved once the citizen who reported the original problem confirms it — outcomes on Samadhan aren't self-certified by the institution or the funder.",
        ],
      },
      {
        heading: "District-level visibility",
        body: [
          "Aggregate reporting shows trends and bottlenecks by district and domain, useful if you're trying to demonstrate where sustained support made a measurable difference over time.",
        ],
      },
    ],
  },

  "resources-industry": {
    eyebrow: "For industry",
    title: "Resources for industry partners.",
    intro: "What to have ready before you get started.",
    sections: [
      {
        heading: "Get verified",
        body: [
          "Industry accounts go through the same admin verification as institutions before they can back a project or appear in the public partner directory.",
        ],
      },
      {
        heading: "Know the verified institution network",
        body: [
          "The public institutions directory lists every verified academic institution on the platform, along with their stated departments and expertise, if you'd rather approach a specific institution directly.",
        ],
      },
      {
        heading: "Review a project before committing",
        body: [
          "A project's milestones, team, and activity log are all public before you register interest — there's no need to commit before seeing how the work is actually progressing.",
        ],
      },
    ],
  },

  "guidelines-industry": {
    eyebrow: "For industry",
    title: "Industry partner guidelines.",
    intro: "A few expectations for how partnership works on Samadhan.",
    sections: [
      {
        heading: "Support the delivery, not the credit",
        body: [
          "Samadhan is built around citizen-confirmed outcomes, not institution or sponsor self-reporting. Expect your involvement to be shown as a contribution to the project record, not as a standalone announcement.",
        ],
      },
      {
        heading: "Respect institution-led delivery",
        body: [
          "Institutions own the delivery of a project — expertise and funding support the team's plan, they don't redirect it.",
        ],
      },
      {
        heading: "Standing applies to industry accounts too",
        body: [
          "Verification and standing (active, warned, suspended, terminated) are enforced the same way for industry accounts as for institutions, independently of each other.",
        ],
      },
    ],
  },

  support: {
    eyebrow: "Contact",
    title: "Support.",
    intro:
      "Most issues on Samadhan are resolved directly within the platform rather than through a separate helpdesk.",
    sections: [
      {
        heading: "Account or access issues",
        body: [
          "Most account issues (wrong role, an organization stuck pending verification, a locked-out sign-in) are resolved by an admin from within the platform itself. If your organization's status screen shows pending or suspended for longer than expected, that's the first thing to flag.",
        ],
      },
      {
        heading: "Reporting a bug",
        body: [
          "If something on the platform is broken — a page that won't load, a submission that silently fails — the most useful report includes the exact page URL, what you did, and what you expected to happen instead.",
        ],
      },
    ],
    cta: {
      label: "Read frequently asked questions",
      href: "/info/help-center",
    },
    showContactChannels: true,
  },

  "help-center": {
    eyebrow: "Contact",
    title: "Help center.",
    intro: "Answers to the questions that come up most often.",
    sections: [
      {
        heading: "I submitted a challenge offline — where did it go?",
        body: [
          "Offline submissions are queued on your device and automatically sent once you're back online and signed in. You'll see it appear on the public challenge list at that point, not before.",
        ],
      },
      {
        heading: "Can I report a challenge by voice or in Hindi?",
        body: [
          'Yes — the report form has a voice-fill button ("Bhasha & Bol") supporting Hindi and English speech, plus a handwriting-scan option for a written note. Every field it fills stays editable before you submit.',
        ],
      },
      {
        heading: "Why can't I see the exact institution assigned to my report?",
        body: [
          "If no institution has picked it up yet, the challenge page shows that plainly rather than guessing. Once one accepts, it's shown there directly, including its live delivery progress.",
        ],
      },
      {
        heading: "How do I change the site language?",
        body: [
          "Use the language switcher in the header (English, हिंदी, or ᱥᱟᱱᱛᱟᱲᱤ). Your choice is remembered on this device.",
        ],
      },
      {
        heading: "I disagree that my challenge was actually fixed — what now?",
        body: [
          "Only you, as the original reporter, can confirm or dispute a closeout. If you dispute it, explain what's still wrong — that reason is shown to the institution before they submit another round.",
        ],
      },
    ],
  },

  "contact-us": {
    eyebrow: "Contact",
    title: "Contact us.",
    intro:
      "Samadhan doesn't route contact through a general phone line or ticketing system — reaching the right person happens inside the platform itself, in context.",
    sections: [
      {
        heading: "In-platform contact",
        body: [
          "Citizens can follow up through their submitted challenge's page. Institutions and industry partners can reach an admin through their organization's verification status screen.",
        ],
      },
      {
        heading: "About the contact details below",
        body: [
          "This page only ever shows a phone number or email address once one is actually real and staffed — never a placeholder that could be mistaken for an official government contact line that doesn't exist.",
        ],
      },
    ],
    showContactChannels: true,
  },

  "privacy-policy": {
    eyebrow: "Legal",
    title: "Privacy policy.",
    intro:
      "This describes what Samadhan actually does with your data, in plain terms — not boilerplate, and not a lawyer-reviewed legal document.",
    sections: [
      {
        heading: "What we store, and where",
        body: [
          "Account details (name, email, role, district) and every challenge, project, and organization record are stored in Google Cloud Firestore. There is no separate application server — your browser talks to Firestore directly, governed entirely by access rules that scope what any one account can read or write.",
        ],
      },
      {
        heading: "Uploaded files",
        body: [
          "Photos and documents you upload as evidence are compressed and stored as encoded data inside the relevant Firestore record itself, not in a separate file-hosting service.",
        ],
      },
      {
        heading: "Sign-in",
        body: [
          "Authentication is handled by Firebase Authentication (email/password, Google, or Facebook sign-in). Samadhan never sees or stores your password directly.",
        ],
      },
      {
        heading: "Third-party services your content may be sent to",
        body: [
          "Two optional features send content to outside services: the AI photo-categorization button sends the selected photo to Groq's vision API to suggest a title, description, and domain; and viewing the site in Hindi or Santali sends untranslated page text to the MyMemory translation API to render it live. Both are used only to provide the feature you triggered.",
        ],
      },
      {
        heading: "What we don't do",
        body: [
          "No advertising trackers, no data resale, and no analytics beyond what's needed to operate the platform.",
        ],
      },
    ],
  },

  "terms-of-use": {
    eyebrow: "Legal",
    title: "Terms of use.",
    intro:
      "These terms describe how Samadhan is meant to be used. They're written to be genuinely accurate about the platform's behavior, not a fully lawyer-reviewed legal agreement.",
    sections: [
      {
        heading: "Report honestly",
        body: [
          "Challenge reports should describe real civic problems you have direct knowledge of. Duplicate or fabricated reports undermine the public ledger everyone else relies on.",
        ],
      },
      {
        heading: "Only the original reporter confirms an outcome",
        body: [
          "Closeout confirmation is restricted to the citizen who filed the original report — don't attempt to confirm or dispute a challenge that isn't yours.",
        ],
      },
      {
        heading:
          "Institutions and industry partners represent real organizations",
        body: [
          "Organization applications are reviewed and verified by an admin before an account can accept challenges or back projects. Misrepresenting your organization can result in suspension or termination of standing.",
        ],
      },
      {
        heading: "The public ledger is exactly that — public",
        body: [
          "Challenges, projects, and their activity history are visible to anyone, by design, so the platform's civic-transparency goal works. Don't submit anything in a public field that you wouldn't want publicly visible (a separate, restricted visibility tier exists for genuinely sensitive reports).",
        ],
      },
      {
        heading: "The platform is under active development",
        body: [
          "Features, data, and availability can change as Samadhan continues to develop — this page will be kept up to date as that happens.",
        ],
      },
    ],
  },
};
