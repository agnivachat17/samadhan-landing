// Dev-only helper: screenshots any app route for visual QA against mockups.
// Protected routes (see ProtectedRoute.tsx) still require a signed-in
// session; this only helps with the routes reachable without one.
//
// Usage:
//   node scripts/screenshot.mjs /citizen/dashboard out.png
//   node scripts/screenshot.mjs /challenges/1 out.png "" "Back to all challenges"
//
// Requires `npm run dev` running (the Vite dev server — there is no API process).
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const [, , route = "/", outFile = "screenshot.png", , clickText] = process.argv;
const baseUrl =
  process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
const outPath = path.isAbsolute(outFile)
  ? outFile
  : path.join(__dirname, "..", outFile);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
// Skip the blocking first-visit language gate (LanguageGate.tsx) for QA screenshots.
await page.addInitScript(() => {
  window.localStorage.setItem("samadhan-language", "en");
});

await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);

if (clickText) {
  await page.locator(`button:has-text("${clickText}")`).first().click();
  await page.waitForTimeout(300);
}

await page.screenshot({ path: outPath, fullPage: !clickText });
await browser.close();
console.log(`Saved ${outPath}`);
