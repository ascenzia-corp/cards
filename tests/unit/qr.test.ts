import jsQR from "jsqr";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cardUrl, qrPng, qrSvg } from "@/lib/qr";

async function decode(png: Buffer): Promise<string | undefined> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
}

const url = cardUrl("https://cards.ascenzia.ai", "laurent.fontaine", "qr");

describe("QR code", () => {
  it("encode l'URL avec ?src=qr", () => {
    expect(url).toBe("https://cards.ascenzia.ai/laurent.fontaine?src=qr");
  });

  it("produit un PNG de 1024 px lisible", async () => {
    const png = await qrPng(url);
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(await decode(png)).toBe(url);
  });

  it("reste lisible avec le logo central", async () => {
    const png = await qrPng(url, { type: "ascenzia" });
    expect(await decode(png)).toBe(url);
  });

  it("produit un SVG, avec et sans logo, rendu lisible", async () => {
    for (const logo of [undefined, { type: "ascenzia" as const }]) {
      const svg = await qrSvg(url, logo);
      expect(svg.startsWith("<svg")).toBe(true);
      const png = await sharp(Buffer.from(svg), { density: 300 }).resize(800).png().toBuffer();
      expect(await decode(png)).toBe(url);
    }
  });
});
