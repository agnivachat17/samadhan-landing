import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveLocalAssetPath } from "./storageProxy";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("resolveLocalAssetPath", () => {
  it("returns an existing extracted asset inside the local public directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "samadhan-assets-"));
    temporaryRoots.push(root);
    const expectedPath = path.join(root, "hero.jpeg");
    fs.writeFileSync(expectedPath, "synthetic fixture");

    expect(resolveLocalAssetPath("hero.jpeg", root)).toBe(expectedPath);
  });

  it("rejects a traversal attempt and a missing local asset", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "samadhan-assets-"));
    temporaryRoots.push(root);

    expect(resolveLocalAssetPath("../outside.jpeg", root)).toBeNull();
    expect(resolveLocalAssetPath("missing.jpeg", root)).toBeNull();
  });
});
