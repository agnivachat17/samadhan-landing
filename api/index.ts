// Vercel serverless function entrypoint.
//
// Deliberately contains no imports other than the pre-bundled server produced
// by `npm run vercel-build` (esbuild -> api/_server.js). See
// server/vercelApp.ts for why this indirection exists.
export { default } from "./_server.js";
