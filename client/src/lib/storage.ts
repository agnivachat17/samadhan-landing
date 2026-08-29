/**
 * File handling without Cloud Storage.
 *
 * Firebase Cloud Storage requires the Blaze (paid) plan, and this project stays
 * on Spark, so uploaded files are stored as base64 inside the Firestore
 * document that references them. That imposes a hard ceiling: a Firestore
 * document cannot exceed 1 MiB *including* every other field, and base64
 * inflates bytes by ~4/3.
 *
 * Images are therefore downscaled and re-encoded until they fit. Anything else
 * (PDFs, etc.) cannot be compressed, so it is rejected with an explicit error
 * rather than failing deep inside the Firestore SDK.
 */

/** Max raw bytes per file, leaving headroom under Firestore's 1 MiB doc limit. */
const MAX_RAW_BYTES = 680 * 1024;
const MAX_IMAGE_EDGE = 1600;
const QUALITY_STEPS = [0.8, 0.65, 0.5, 0.38, 0.28];

export function sanitizeFileName(name: string, fallback: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-") || fallback;
}

/** Approximate decoded byte length of a base64 payload without decoding it. */
function base64Bytes(dataUrl: string) {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

function humanSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be read."));
    image.src = dataUrl;
  });
}

async function compressImage(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl);

  const scale = Math.min(
    1,
    MAX_IMAGE_EDGE / Math.max(image.width, image.height)
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not process the image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let best = canvas.toDataURL("image/jpeg", QUALITY_STEPS[0]);
  for (const quality of QUALITY_STEPS) {
    best = canvas.toDataURL("image/jpeg", quality);
    if (base64Bytes(best) <= MAX_RAW_BYTES) return best;
  }

  throw new Error(
    `That image is too large to store even after compression (${humanSize(base64Bytes(best))}). Please crop it or pick a smaller file.`
  );
}

/**
 * Normalises an uploaded file into a storable payload. Returns the base64 data
 * URL to persist alongside the record.
 */
export async function prepareStoredFile(input: {
  base64: string;
  mimeType: string;
}): Promise<{ fileData: string; mimeType: string }> {
  const isImage = input.mimeType.startsWith("image/");
  const dataUrl = input.base64.startsWith("data:")
    ? input.base64
    : `data:${input.mimeType};base64,${input.base64}`;

  if (isImage) {
    const compressed =
      base64Bytes(dataUrl) <= MAX_RAW_BYTES
        ? dataUrl
        : await compressImage(dataUrl);
    return {
      fileData: compressed,
      mimeType: compressed.startsWith("data:image/jpeg")
        ? "image/jpeg"
        : input.mimeType,
    };
  }

  if (base64Bytes(dataUrl) > MAX_RAW_BYTES) {
    throw new Error(
      `This file is ${humanSize(base64Bytes(dataUrl))}. Non-image files must be under ${humanSize(MAX_RAW_BYTES)} because they are stored inside the database record.`
    );
  }

  return { fileData: dataUrl, mimeType: input.mimeType };
}

/**
 * Turns a stored base64 payload into an object URL.
 *
 * Object URLs (not the raw data URL) are what the UI links to, because Chrome
 * blocks top-level navigation to `data:` URLs — and every consumer renders
 * these as `<a href={fileUrl} target="_blank">`. Results are cached per record
 * so repeated renders don't leak a new URL each time.
 */
const objectUrlCache = new Map<string, string>();

export function storedFileUrl(cacheKey: string, fileData: string): string {
  const cached = objectUrlCache.get(cacheKey);
  if (cached) return cached;

  const [header, payload] = [
    fileData.slice(0, fileData.indexOf(",")),
    fileData.slice(fileData.indexOf(",") + 1),
  ];
  const mimeType =
    header.slice(5).replace(";base64", "") || "application/octet-stream";

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);

  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  objectUrlCache.set(cacheKey, url);
  return url;
}
