// Types for the esbuild-generated `api/_server.js` bundle (see
// server/vercelApp.ts). The bundle itself is gitignored and only exists after
// `npm run vercel-build`, but Vercel's Node builder typechecks the function
// entrypoint — without this declaration `api/index.ts` fails to compile with
// TS7016 ("Could not find a declaration file for module './_server.js'").
import type { RequestListener } from "node:http";

declare const app: RequestListener;
export default app;
