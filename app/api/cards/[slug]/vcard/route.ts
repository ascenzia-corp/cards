import { NextResponse } from "next/server";
import { buildCardVCard } from "@/lib/card-assets";
import { getPublicCard, recordEvent } from "@/lib/cards";
import { errorResponse } from "@/lib/http";
import { parseSource } from "@/lib/ip";
import { vcardFilename } from "@/lib/vcard";

/** F-04 : vCard 3.0 avec photo, en un geste. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const card = await getPublicCard(slug);
    if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    const vcf = await buildCardVCard(card);
    const src = parseSource(new URL(req.url).searchParams.get("src"));
    await recordEvent(card.id, "vcard_download", src, req.headers).catch((e) =>
      console.error("event", e),
    );
    return new NextResponse(vcf, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${vcardFilename(card.slug)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
