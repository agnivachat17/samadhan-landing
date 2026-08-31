/**
 * Hash-anchored ledger utility — Spark-safe tamper evidence.
 *
 * No deps: uses browser `SubtleCrypto` (requires secure context — Cloudflare
 * HTTPS in prod, localhost in dev). Hashes are hex strings persisted alongside
 * Firestore docs, so old docs without them read as undefined.
 */

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return hex(digest);
}

function canonical(value: Record<string, unknown>): string {
  return JSON.stringify(value, Object.keys(value).sort());
}

export async function chainHash(
  prevHash: string,
  payload: Record<string, unknown>
): Promise<string> {
  return sha256Hex(canonical({ prevHash, ...payload }));
}

export async function fileDataHash(fileData: string): Promise<string> {
  return sha256Hex(fileData);
}

export async function merkleRoot(hashes: string[]): Promise<string> {
  if (hashes.length === 0) return sha256Hex("EMPTY");
  let layer = [...hashes].sort();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < layer.length; index += 2) {
      const left = layer[index]!;
      const right = layer[index + 1] ?? left;
      next.push(await sha256Hex(left + right));
    }
    layer = next;
  }
  return layer[0]!;
}

export async function verifyChain(
  entries: { hash: string; prevHash: string }[],
  recompute: (
    entry: { hash: string; prevHash: string },
    index: number
  ) => Promise<string>
): Promise<{ valid: boolean; tamperAt: number | null }> {
  for (let index = 0; index < entries.length; index += 1) {
    const expected = await recompute(entries[index]!, index);
    if (expected !== entries[index]!.hash)
      return { valid: false, tamperAt: index };
  }
  return { valid: true, tamperAt: null };
}
