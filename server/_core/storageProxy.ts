import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import { ENV } from "./env";

const LOCAL_ASSET_ROOT = path.resolve(process.cwd(), "client", "public", "manus-storage");

/**
 * Resolves an extracted local visual asset without allowing path traversal.
 * This keeps `/manus-storage/...` references portable when the asset bundle is
 * unpacked into `client/public` for a local Vite/Express setup.
 */
export function resolveLocalAssetPath(key: string, localAssetRoot = LOCAL_ASSET_ROOT): string | null {
  const resolvedPath = path.resolve(localAssetRoot, key);
  const rootWithSeparator = `${localAssetRoot}${path.sep}`;

  if (!resolvedPath.startsWith(rootWithSeparator)) {
    return null;
  }

  try {
    return fs.statSync(resolvedPath).isFile() ? resolvedPath : null;
  } catch {
    return null;
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const localAssetPath = resolveLocalAssetPath(key);
    if (localAssetPath) {
      res.sendFile(localAssetPath, { cacheControl: true, maxAge: "1h" });
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
