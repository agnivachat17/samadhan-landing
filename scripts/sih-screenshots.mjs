// SIH Screenshot Suite — any page + batch mode for PPT
// Extends scripts/screenshot.mjs with auth, batch, and SIH-friendly defaults.
//
// Usage:
//   Single page (public):
//     node scripts/sih-screenshots.mjs /challenges out.png
//   Single page (authenticated):
//     node scripts/sih-screenshots.mjs /institute/dashboard out.png --role institute
//     node scripts/sih-screenshots.mjs /admin/reports idea/screenshots/06-gis.png --role admin
//   Full SIH batch (captures 12 pages to idea/screenshots/):
//     node scripts/sih-screenshots.mjs --sih
//   Custom viewport:
//     node scripts/sih-screenshots.mjs / --viewport 1920x1080
//   Show language gate (no bypass):
//     node scripts/sih-screenshots.mjs / out.png --show-gate
//
// Roles & credentials (from user-provided test accounts):
//   citizen   → Google OAuth (ankanmondal9280@gmail.com) — CANNOT be automated headless (Google blocks)
//               → fallback: captures as guest with note; or create citizen.test@samadhan.test
//   institute → ankan1.mondal@stu.adamasuniversity.ac.in / Ankan@1234 (email+password, automatable)
//   admin     → agnivachat17@gmail.com / Agniva@1234
//   industry  → industry.test@samadhan.test / Industry@1234 (auto-created 2026)
//
// Requires `npm run dev` running (Vite dev server). No API process needed.

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Credentials ──
const CREDS = {
  institute: {
    email: "ankan1.mondal@stu.adamasuniversity.ac.in",
    password: "Ankan@1234",
  },
  admin: {
    email: "agnivachat17@gmail.com",
    password: "Agniva@1234",
  },
  industry: {
    email: "industry.test@samadhan.test",
    password: "Industry@1234",
  },
  // Citizen Google account cannot be automated via Playwright headless (Google anti-bot + popup).
  // If you create a password citizen, add it here:
  // citizen: { email: "citizen.test@samadhan.test", password: "Citizen@1234" },
};

// ── Args ──
const rawArgs = process.argv.slice(2);
const hasFlag = f => rawArgs.includes(f);
const getFlagVal = f => {
  const idx = rawArgs.indexOf(f);
  if (idx !== -1 && rawArgs[idx + 1] && !rawArgs[idx + 1].startsWith("--"))
    return rawArgs[idx + 1];
  if (f.includes("=")) return f.split("=")[1];
  const eq = rawArgs.find(a => a.startsWith(f + "="));
  return eq ? eq.split("=")[1] : null;
};

const isSihBatch = hasFlag("--sih");
const showGate = hasFlag("--show-gate");
const roleFlag =
  getFlagVal("--role") ||
  rawArgs.find(a => a.startsWith("--role="))?.split("=")[1] ||
  null;
const viewportFlag = getFlagVal("--viewport");
const helpFlag = hasFlag("--help") || hasFlag("-h");

if (helpFlag) {
  console.log(`
SIH Screenshots — Samadhan

Usage:
  node scripts/sih-screenshots.mjs <route> <outFile> [--role institute|admin|industry] [--viewport 1920x1080] [--show-gate]
  node scripts/sih-screenshots.mjs --sih [--viewport 1920x1080]

Examples:
  node scripts/sih-screenshots.mjs / idea/screenshots/01-landing.png
  node scripts/sih-screenshots.mjs /institute/dashboard idea/screenshots/07-institute.png --role institute
  node scripts/sih-screenshots.mjs --sih

Roles: institute, admin, industry (citizen Google = manual, not automatable headless)
`);
  process.exit(0);
}

// ── Config ──
const baseUrl =
  process.env.APP_URL || `http://localhost:${process.env.PORT || 5173}`;
let viewport = { width: 1440, height: 900 };
if (viewportFlag) {
  const [w, h] = viewportFlag.split("x").map(Number);
  if (w && h) viewport = { width: w, height: h };
}
// SIH wants crisp 16:9 — default batch to 1920x1080 for PPT
if (isSihBatch && !viewportFlag) viewport = { width: 1920, height: 1080 };

// ── Batch definition (SIH) ──
// Each entry: { route, outFile, role, note, waitMs }
const SIH_SHOTS = [
  {
    route: "/",
    outFile: "idea/screenshots/01-landing-hero.png",
    role: null,
    desc: "Landing hero — waterfall, tagline, CTAs, language gate bypassed",
  },
  {
    route: "/challenges",
    outFile: "idea/screenshots/02-challenges-list.png",
    role: null,
    desc: "Public challenge directory — filters, search, map, upvote",
  },
  {
    route: "/challenges/730010",
    outFile: "idea/screenshots/03-challenge-detail.png",
    role: null,
    desc: "Challenge detail — evidence, timeline, upvote/follow, enroll CTA (if institution logged in)",
  },
  {
    route: "/citizen/submit",
    outFile: "idea/screenshots/04-submit-challenge.png",
    role: null,
    desc: "Submit flow — Bhasha & Bol voice + handwriting OCR + AI scan + duplicate check + map picker",
  },
  {
    route: "/login",
    outFile: "idea/screenshots/05-login.png",
    role: null,
    desc: "Auth — email/password + Google/Facebook",
  },
  {
    route: "/signup",
    outFile: "idea/screenshots/06-signup.png",
    role: null,
    desc: "Sign-up — citizen/institution/industry paths",
  },
  {
    route: "/institute/dashboard",
    outFile: "idea/screenshots/07-institute-dashboard.png",
    role: "institute",
    desc: "Institute dashboard — assigned challenges queue, Review → /challenges/:id",
  },
  {
    route: "/institute/challenges",
    outFile: "idea/screenshots/08-institute-challenges.png",
    role: "institute",
    desc: "Institute challenges — My assignments + Available challenges (Enroll)",
  },
  {
    route: "/institute/projects/1",
    outFile: "idea/screenshots/09-project-workspace.png",
    role: "institute",
    desc: "Project workspace — delivery control, milestones, activity, docs (may need valid project id)",
  },
  {
    route: "/admin/dashboard",
    outFile: "idea/screenshots/10-admin-dashboard.png",
    role: "admin",
    desc: "Admin center — stats, verification queue",
  },
  {
    route: "/admin/reports",
    outFile: "idea/screenshots/11-gis-command-center.png",
    role: "admin",
    desc: "GIS Command Center — choropleth heatmap, bottleneck alerts, trends",
  },
  {
    route: "/admin/projects",
    outFile: "idea/screenshots/12-admin-projects.png",
    role: "admin",
    desc: "Admin projects — closeout review, ledger seal",
  },
  {
    route: "/industry/dashboard",
    outFile: "idea/screenshots/13-industry-dashboard.png",
    role: "industry",
    desc: "Industry dashboard — CSR matching, project interests",
  },
  {
    route: "/",
    outFile: "idea/screenshots/14-language-gate.png",
    role: null,
    showGate: true,
    desc: "First-visit language gate — English/Hindi blocking choice (no localStorage bypass)",
  },
];

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function loginAs(page, role) {
  if (!role) return;
  if (role === "citizen") {
    console.log(
      "  ⚠ Citizen is Google OAuth (ankanmondal9280@gmail.com) — cannot automate headless. Capturing as guest; for authenticated citizen, create a password citizen or screenshot manually after Google login."
    );
    return;
  }
  const cred = CREDS[role];
  if (!cred) {
    console.warn(`  ⚠ No credentials for role=${role}. Skipping login.`);
    return;
  }
  console.log(`  → Logging in as ${role} (${cred.email})…`);
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Fill email + password (Login.tsx: placeholder "you@example.com" / "Enter your password")
  const emailInput = page.getByPlaceholder("you@example.com");
  const passInput = page.getByPlaceholder("Enter your password");
  const loginBtn = page.getByRole("button", { name: "Log in" });

  await emailInput.fill(cred.email);
  await passInput.fill(cred.password);
  await loginBtn.click();

  // Wait for redirect away from /login (to dashboard)
  try {
    await page.waitForURL(url => !url.pathname.includes("/login"), {
      timeout: 12000,
    });
    await page.waitForTimeout(2000);
    console.log(`  ✓ Logged in as ${role} → ${page.url()}`);
  } catch {
    const errText = await page
      .locator('[role="alert"]')
      .first()
      .textContent()
      .catch(() => "");
    console.warn(
      `  ✗ Login as ${role} may have failed. Staying on ${page.url()}. Alert: ${errText?.trim()?.slice(0, 120)}`
    );
    // screenshot will still happen — useful for debugging
    await page.waitForTimeout(1500);
  }
}

async function captureOne(
  browser,
  { route, outFile, role, showGate: shotShowGate, desc }
) {
  const useGate = shotShowGate ?? showGate;
  const outPath = path.isAbsolute(outFile)
    ? outFile
    : path.join(__dirname, "..", outFile);
  await ensureDir(outPath);

  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  // Bypass language gate unless explicitly requested to show it
  if (!useGate) {
    await page.addInitScript(() => {
      window.localStorage.setItem("samadhan-language", "en");
    });
  } else {
    await page.addInitScript(() => {
      window.localStorage.removeItem("samadhan-language");
    });
  }

  // Auth if needed
  if (role) {
    await loginAs(page, role);
  }

  // Navigate to target
  console.log(`  → Capturing ${route} → ${outFile} ${desc ? `(${desc})` : ""}`);
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  // Firestore + Leaflet + Framer Motion need a moment. domcontentloaded + 2.2s mirrors screenshot.mjs (networkidle never settles with Firestore).
  await page.waitForTimeout(2200);

  // Small scroll to trigger any lazy loads
  await page.evaluate(() => window.scrollTo(0, 80));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`  ✓ Saved ${outPath}`);
  await context.close();
  return outPath;
}

async function main() {
  // Single-shot mode: positional route/outFile + --role
  if (!isSihBatch) {
    const positional = rawArgs.filter(a => !a.startsWith("--"));
    const route = positional[0] || "/";
    const outFile = positional[1] || "screenshot.png";
    const role = roleFlag || null;

    // Validate role
    if (role && !CREDS[role] && role !== "citizen") {
      console.error(
        `Unknown --role=${role}. Use: institute, admin, industry, citizen`
      );
      process.exit(1);
    }

    const browser = await chromium.launch();
    try {
      // Check dev server reachable
      const probe = await fetch(baseUrl)
        .then(r => r.ok)
        .catch(() => false);
      if (!probe) {
        console.error(
          `✗ Dev server not reachable at ${baseUrl}. Run: npm run dev`
        );
        process.exit(1);
      }
      await captureOne(browser, { route, outFile, role, desc: "" });
    } finally {
      await browser.close();
    }
    return;
  }

  // Batch SIH mode
  console.log(
    `\nSIH Batch — ${SIH_SHOTS.length} shots @ ${viewport.width}x${viewport.height} → idea/screenshots/`
  );
  console.log(`Base: ${baseUrl}\n`);

  const browser = await chromium.launch();
  try {
    const probe = await fetch(baseUrl)
      .then(r => r.ok)
      .catch(() => false);
    if (!probe) {
      console.error(
        `✗ Dev server not reachable at ${baseUrl}. Run: npm run dev (Vite on :5173) and retry.`
      );
      process.exit(1);
    }

    const results = [];
    for (const shot of SIH_SHOTS) {
      try {
        const p = await captureOne(browser, shot);
        results.push({ ...shot, ok: true, path: p });
      } catch (e) {
        console.error(`  ✗ Failed ${shot.route}:`, e.message?.slice(0, 200));
        results.push({ ...shot, ok: false, error: e.message });
      }
    }

    console.log("\n— Batch summary —");
    results.forEach(r =>
      console.log(
        `  ${r.ok ? "✓" : "✗"} ${r.outFile}  ${r.role ? `[${r.role}]` : "[public]"}  ${r.ok ? "" : r.error?.slice(0, 80)}`
      )
    );
    const outDir = path.join(__dirname, "..", "idea", "screenshots");
    console.log(`\nAll done. Files in ${outDir}`);
    console.log("\nTips:");
    console.log(
      "  • Citizen dashboard needs Google OAuth — screenshot manually after signing in as ankanmondal9280@gmail.com, or create citizen.test@samadhan.test (password) and add to CREDS."
    );
    console.log(
      "  • If a project id (e.g. /institute/projects/1) shows 'not found', replace 1 with a real id from Firestore and re-run that single shot:"
    );
    console.log(
      "    node scripts/sih-screenshots.mjs /institute/projects/<realId> idea/screenshots/09-project-workspace.png --role institute"
    );
    console.log(
      "  • For 16:9 PPT, use --viewport 1920x1080 (default for --sih) or crop in PowerPoint."
    );
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
