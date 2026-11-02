import { and, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getPublicCard } from "@/lib/cards";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { clientIp, hashIp, parseSource } from "@/lib/ip";

const DEDUP_MS = 30 * 60 * 1000;

/** Enregistre une vue et son canal (F-09). Une même IP n'est comptée qu'une fois par 30 minutes et par canal. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const card = await getPublicCard(slug);
    if (!card) return new NextResponse(null, { status: 404 });
    let src: string | undefined;
    try {
      src = (JSON.parse((await req.text()).slice(0, 200)) as { src?: string }).src;
    } catch {
      src = undefined;
    }
    const source = parseSource(src ?? "link");
    const ipHash = hashIp(clientIp(req.headers));
    const db = getDb();
    const recent = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.cardId, card.id),
          eq(events.type, "view"),
          eq(events.source, source),
          eq(events.ipHash, ipHash),
          gte(events.createdAt, new Date(Date.now() - DEDUP_MS)),
        ),
      )
      .limit(1);
    if (!recent.length)
      await db.insert(events).values({ cardId: card.id, type: "view", source, ipHash });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("view", e);
    return new NextResponse(null, { status: 204 });
  }
}
