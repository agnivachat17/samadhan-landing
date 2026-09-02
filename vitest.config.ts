import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

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
    include: ["tests/**/*.test.ts", "client/src/**/*.test.ts"],
    // Requires the Firestore emulator running locally (Java + a one-time
    // ~130MB emulator jar download) — not something plain `npm test` /
    // CI (`.github/workflows/deploy.yml`) can assume. Run explicitly via
    // `npm run test:rules:emulator`, which points vitest directly at this
    // file regardless of this exclude.
    exclude: ["**/node_modules/**", "tests/firestore.rules.emulator.test.ts"],
  },
});
