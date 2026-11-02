/** Outils couleur : parsing hexadécimal, mélange, luminance et contraste WCAG 2.1 (F-06). */

export type Rgb = { r: number; g: number; b: number };

const HEX_RE = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

export function hexToRgb(hex: string): Rgb {
  const m = HEX_RE.exec(hex);
  if (!m?.[1]) throw new Error(`Couleur hexadécimale invalide : ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** Format exigé par pass.json : `rgb(r, g, b)` */
export function toPassRgb(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Mélange linéaire en sRGB : ratio 0 = a, 1 = b */
export function mix(a: string, b: string, ratio: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({
    r: x.r + (y.r - x.r) * ratio,
    g: x.g + (y.g - x.g) * ratio,
    b: x.b + (y.b - x.b) * ratio,
  });
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const WCAG_AA = 4.5;

/** Couleur de texte (noir profond ou blanc cassé) offrant le meilleur contraste sur `bg`. */
export function readableOn(bg: string, dark = "#11151d", light = "#ffffff"): string {
  return contrastRatio(bg, dark) >= contrastRatio(bg, light) ? dark : light;
}
