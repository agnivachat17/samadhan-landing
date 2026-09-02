import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

/**
 * Separate from `vitest.config.ts` on purpose. That config's `exclude`
 * deliberately keeps `tests/firestore.rules.emulator.test.ts` out of the
 * default `npm test` run (see the comment there) — and passing an explicit
 * filename to `vitest run` does NOT override a config-level `exclude`
 * (verified: it produces "No test files found"). This config exists solely
 * to give `npm run test:rules:emulator` an `include` that targets that one
 * file with no conflicting `exclude`.
 */
export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/firestore.rules.emulator.test.ts"],
  },
});
