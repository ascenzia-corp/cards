/**
 * Images du paquet .pkpass (section 6) : icon (obligatoire), logo et thumbnail (optionnels).
 * Tailles en points : icon 29×29, logo 160×50 max, thumbnail 90×90 max ; déclinées en @2x et @3x.
 */
import sharp from "sharp";
import { MARK_RATIO, markSvg } from "../brand-mark";
import type { PassImages } from "./generate";

const SCALES = [1, 2, 3] as const;
const suffix = (s: number) => (s === 1 ? "" : `@${s}x`);

function hexFromPassRgb(rgb: string): string {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(rgb);
  if (!m) return "#000000";
  return "#" + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("");
}

/** Image source centrée dans un carré opaque de la couleur du pass, avec marge. */
async function squareIcon(source: Buffer, px: number, background: string, padding = 0.16) {
  const inner = Math.max(1, Math.round(px * (1 - 2 * padding)));
  const fitted = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: px, height: px, channels: 4, background } })
    .composite([{ input: fitted, gravity: "center" }])
    .png()
    .toBuffer();
}

function markPng(heightPx: number, aColor: string) {
  const width = Math.round(heightPx * MARK_RATIO);
  return sharp(Buffer.from(markSvg(aColor, { width, height: heightPx })), { density: 300 })
    .resize(width, heightPx)
    .png()
    .toBuffer();
}

export async function iconSetFrom(source: Buffer, passBackground: string): Promise<PassImages> {
  const bg = hexFromPassRgb(passBackground);
  const out: PassImages = {};
  for (const s of SCALES) out[`icon${suffix(s)}.png`] = await squareIcon(source, 29 * s, bg);
  return out;
}

/** Icône et logo Ascenzia : monogramme de la charte, « A » blanc sur fond navy. */
export async function ascenziaBrandImages(passBackground: string): Promise<PassImages> {
  const out: PassImages = {};
  const big = await markPng(300, "#ffffff");
  Object.assign(out, await iconSetFrom(big, passBackground));
  for (const s of SCALES)
    out[`logo${suffix(s)}.png`] = await markPng(Math.round(40 * s), "#ffffff");
  return out;
}

/** Logo d'une carte perso, contenu dans 160×50 points. */
export async function personalLogoImages(logo: Buffer): Promise<PassImages> {
  const out: PassImages = {};
  for (const s of SCALES) {
    out[`logo${suffix(s)}.png`] = await sharp(logo)
      .resize(160 * s, 50 * s, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer();
  }
  return out;
}

/** Vignette photo 90×90 points, à partir de la photo carrée recadrée. */
export async function thumbnailImages(photo: Buffer): Promise<PassImages> {
  const out: PassImages = {};
  for (const s of SCALES) {
    out[`thumbnail${suffix(s)}.png`] = await sharp(photo)
      .resize(90 * s, 90 * s, { fit: "cover" })
      .png()
      .toBuffer();
  }
  return out;
}
