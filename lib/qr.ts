/**
 * QR codes (F-10) : correction d'erreur niveau M, PNG 1024 px et SVG, avec ou sans logo central.
 * Le logo occupe au plus ~4 % de la surface, sous la capacité de correction du niveau M (~15 %).
 */
import QRCode from "qrcode";
import sharp from "sharp";
import { MARK_RATIO, MARK_VIEWBOX, MARK_A_PATH, MARK_SWOOSH_PATH } from "./brand-mark";

export type QrSource = "qr" | "wallet" | "nfc" | "link";

export function cardUrl(baseUrl: string, slug: string, src?: QrSource): string {
  return `${baseUrl}/${slug}${src ? `?src=${src}` : ""}`;
}

const QR_OPTIONS = { errorCorrectionLevel: "M" as const, margin: 2 };
export const QR_PNG_SIZE = 1024;
/** Côté de la pastille blanche du logo, en fraction du côté du QR */
const BADGE = 0.2;

export type QrLogo = { type: "ascenzia" } | { type: "raster"; png: Buffer };

export async function qrPng(text: string, logo?: QrLogo): Promise<Buffer> {
  const qr = await QRCode.toBuffer(text, {
    ...QR_OPTIONS,
    type: "png",
    width: QR_PNG_SIZE,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
  if (!logo) return qr;
  const badge = Math.round(QR_PNG_SIZE * BADGE);
  const inner = Math.round(badge * 0.8);
  const logoPng =
    logo.type === "ascenzia"
      ? await sharp(Buffer.from(markSvgFor("#1a202c")), { density: 400 })
          .resize(inner, inner, {
            fit: "contain",
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .png()
          .toBuffer()
      : await sharp(logo.png)
          .resize(inner, inner, {
            fit: "contain",
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .png()
          .toBuffer();
  const plate = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${badge}" height="${badge}"><rect width="${badge}" height="${badge}" rx="${badge * 0.18}" fill="#ffffff"/></svg>`,
    ),
  )
    .composite([{ input: logoPng, gravity: "center" }])
    .png()
    .toBuffer();
  return sharp(qr)
    .composite([{ input: plate, gravity: "center" }])
    .png()
    .toBuffer();
}

function markSvgFor(aColor: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="${Math.round(100 * MARK_RATIO)}" height="100"><path fill="${aColor}" d="${MARK_A_PATH}"/><path fill="#ddac63" d="${MARK_SWOOSH_PATH}"/></svg>`;
}

export async function qrSvg(text: string, logo?: QrLogo): Promise<string> {
  const svg = await QRCode.toString(text, { ...QR_OPTIONS, type: "svg" });
  if (!logo) return svg;
  const size = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1] ?? 0);
  if (!size) return svg;
  const badge = size * BADGE;
  const origin = (size - badge) / 2;
  const inner = badge * 0.8;
  const innerOrigin = (size - inner) / 2;
  let content: string;
  if (logo.type === "ascenzia") {
    content = `<svg x="${innerOrigin}" y="${innerOrigin}" width="${inner}" height="${inner}" viewBox="${MARK_VIEWBOX}" preserveAspectRatio="xMidYMid meet"><path fill="#1a202c" d="${MARK_A_PATH}"/><path fill="#ddac63" d="${MARK_SWOOSH_PATH}"/></svg>`;
  } else {
    const png = await sharp(logo.png).resize(256, 256, { fit: "inside" }).png().toBuffer();
    content = `<image x="${innerOrigin}" y="${innerOrigin}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${png.toString("base64")}"/>`;
  }
  const overlay = `<rect x="${origin}" y="${origin}" width="${badge}" height="${badge}" rx="${badge * 0.18}" fill="#ffffff"/>${content}`;
  return svg.replace(/<\/svg>\s*$/, `${overlay}</svg>`);
}
