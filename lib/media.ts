/**
 * Traitement des images envoyées (F-32, N-07) : type réel vérifié par le contenu,
 * 5 Mo maximum, recadrage carré et variantes pré-calculées.
 */
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type { MediaKind } from "./media-path";

export class MediaError extends Error {}

/** Vérifie la signature binaire puis le format décodé par sharp (jamais l'extension). */
export async function assertImage(buffer: Buffer): Promise<"jpeg" | "png" | "webp"> {
  if (buffer.length === 0) throw new MediaError("Fichier vide.");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new MediaError("Fichier trop lourd (5 Mo maximum).");
  const magic = buffer.subarray(0, 12);
  const isJpeg = magic[0] === 0xff && magic[1] === 0xd8 && magic[2] === 0xff;
  const isPng = magic
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    magic.subarray(0, 4).toString("ascii") === "RIFF" &&
    magic.subarray(8, 12).toString("ascii") === "WEBP";
  if (!isJpeg && !isPng && !isWebp)
    throw new MediaError("Format refusé : JPEG, PNG ou WebP uniquement.");
  let format: string | undefined;
  try {
    const meta = await sharp(buffer).metadata();
    format = meta.format;
    if (!meta.width || !meta.height) throw new Error();
    if (meta.width * meta.height > 50_000_000) throw new MediaError("Image trop grande.");
  } catch (e) {
    if (e instanceof MediaError) throw e;
    throw new MediaError("Image illisible.");
  }
  if (!format || !ACCEPTED_FORMATS.has(format))
    throw new MediaError("Format refusé : JPEG, PNG ou WebP uniquement.");
  return format as "jpeg" | "png" | "webp";
}

/** Recadrage carré en fractions de l'image (0..1), issu de l'outil de recadrage de l'admin. */
export interface SquareCrop {
  x: number;
  y: number;
  size: number;
}

/** Variantes produites pour chaque type de média : nom de fichier → [contenu, type MIME]. */
export type Variants = Record<string, [Buffer, string]>;

export const PHOTO_FILES = {
  master: "master.jpg",
  page: "page.webp",
  vcard: "vcard.jpg",
  og: "og.jpg",
} as const;
export const LOGO_FILES = { master: "logo.png" } as const;
export const BACKGROUND_FILES = { page: "background.webp" } as const;

async function squareMaster(buffer: Buffer, crop?: SquareCrop): Promise<Buffer> {
  const img = sharp(buffer).rotate(); // applique l'orientation EXIF puis la retire
  const { data, info } = await img.toBuffer({ resolveWithObject: true });
  const base = sharp(data);
  let region: { left: number; top: number; width: number; height: number };
  const side = Math.min(info.width, info.height);
  if (crop && crop.size > 0) {
    const size = Math.max(
      1,
      Math.min(side, Math.round(crop.size * Math.min(info.width, info.height))),
    );
    const left = Math.max(0, Math.min(info.width - size, Math.round(crop.x * info.width)));
    const top = Math.max(0, Math.min(info.height - size, Math.round(crop.y * info.height)));
    region = { left, top, width: size, height: size };
  } else {
    region = {
      left: Math.round((info.width - side) / 2),
      top: Math.round((info.height - side) / 2),
      width: side,
      height: side,
    };
  }
  return base
    .extract(region)
    .resize(1024, 1024, { fit: "cover", withoutEnlargement: false })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

export async function processPhoto(buffer: Buffer, crop?: SquareCrop): Promise<Variants> {
  await assertImage(buffer);
  const master = await squareMaster(buffer, crop);
  const [page, vcard, og] = await Promise.all([
    sharp(master).resize(288, 288).webp({ quality: 78 }).toBuffer(),
    sharp(master).resize(256, 256).jpeg({ quality: 78, mozjpeg: true }).toBuffer(),
    sharp(master).resize(400, 400).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
  ]);
  return {
    [PHOTO_FILES.master]: [master, "image/jpeg"],
    [PHOTO_FILES.page]: [page, "image/webp"],
    [PHOTO_FILES.vcard]: [vcard, "image/jpeg"],
    [PHOTO_FILES.og]: [og, "image/jpeg"],
  };
}

export async function processLogo(buffer: Buffer): Promise<Variants> {
  await assertImage(buffer);
  const logo = await sharp(buffer)
    .rotate()
    .trim({ threshold: 10 })
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()
    .catch(() =>
      sharp(buffer)
        .rotate()
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer(),
    );
  return { [LOGO_FILES.master]: [logo, "image/png"] };
}

export async function processBackground(buffer: Buffer): Promise<Variants> {
  await assertImage(buffer);
  const bg = await sharp(buffer)
    .rotate()
    .resize(900, 1400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();
  return { [BACKGROUND_FILES.page]: [bg, "image/webp"] };
}

export { mediaFolder, mediaVersion } from "./media-path";
