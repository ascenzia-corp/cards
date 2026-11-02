import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { buildCardPass } from "@/lib/card-assets";
import { countRecentEvents, getPublicCard, recordEvent } from "@/lib/cards";
import { getDb } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { errorResponse } from "@/lib/http";
import { PKPASS_MIME } from "@/lib/pass";
import { reportError } from "@/lib/report";

export const runtime = "nodejs";

const PASSES_PER_HOUR = 20;

/** F-11, section 6 : .pkpass signé, généré à la demande. Limité à 20 par heure et par IP (N-06). */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const card = await getPublicCard(slug);
    if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    if ((await countRecentEvents("pass_generated", req.headers, 3_600_000)) >= PASSES_PER_HOUR) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez dans une heure." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }
    const pkpass = await buildCardPass(card);
    await Promise.all([
      recordEvent(card.id, "pass_generated", "unknown", req.headers),
      getDb().update(cards).set({ passGeneratedAt: new Date() }).where(eq(cards.id, card.id)),
    ]);
    return new NextResponse(new Uint8Array(pkpass), {
      headers: {
        "Content-Type": PKPASS_MIME,
        "Content-Disposition": `attachment; filename="${card.slug}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    await reportError("Échec de génération du pass Wallet", e, { slug });
    return errorResponse(e);
  }
}
