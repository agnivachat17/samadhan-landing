import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

/**
 * Express app used as the Vercel serverless function handler.
 *
 * This file is NOT the function entrypoint Vercel sees. It is bundled by
 * esbuild into `api/_server.js` (see the `vercel-build` npm script), and
 * `api/index.ts` re-exports that bundle. The indirection exists because
 * Vercel's Node builder transpiles TypeScript per-file instead of bundling,
 * so it cannot resolve this repo's tsconfig path aliases or its extensionless
 * relative imports — which crashed every API request with
 * FUNCTION_INVOCATION_FAILED. Bundling first removes that whole class of
 * failure. Keep imports here relative and alias-free anyway, for safety.
 */
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      // Surfaces server-side failures in the Vercel function logs; without
      // this a 500 shows up client-side as unparseable non-JSON.
      console.error(`[tRPC] ${path ?? "<no-path>"} failed:`, error);
    },
  })
);

export default app;
