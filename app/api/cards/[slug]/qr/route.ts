import { NextResponse } from "next/server";
import { qrLogoFor } from "@/lib/card-assets";
import { getPublicCard, recordEvent } from "@/lib/cards";
import { publicBaseUrl } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { cardUrl, qrPng, qrSvg, type QrSource } from "@/lib/qr";

const SOURCES: QrSource[] = ["qr", "nfc", "link", "wallet"];

/** F-10 : GET /api/cards/[slug]/qr?format=png|svg&logo=1 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const card = await getPublicCard(slug);
    if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    const q = new URL(req.url).searchParams;
    const format = q.get("format") === "svg" ? "svg" : "png";
    const withLogo = q.get("logo") === "1";
    const src = (SOURCES as string[]).includes(q.get("src") ?? "")
      ? (q.get("src") as QrSource)
      : "qr";
    const text = cardUrl(publicBaseUrl(), card.slug, src);
    const logo = withLogo ? await qrLogoFor(card) : undefined;
    const download = q.get("download") === "1";
    const filename = `qr-${card.slug}${withLogo ? "-logo" : ""}.${format}`;
    const headers: Record<string, string> = {
      "Cache-Control": "private, max-age=300",
      ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
    };
    if (download)
      await recordEvent(card.id, "qr_download", "unknown", req.headers).catch((e) =>
        console.error(e),
      );
    if (format === "svg") {
      return new NextResponse(await qrSvg(text, logo), {
        headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" },
      });
    }
    return new NextResponse(new Uint8Array(await qrPng(text, logo)), {
      headers: { ...headers, "Content-Type": "image/png" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
