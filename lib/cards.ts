import "server-only";
/** Accès aux cartes en base. */
import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { cardLinks, cards, events, users, type CardWithLinks } from "./db/schema";
import { clientIp, hashIp, type EventSource } from "./ip";

export async function getCardBySlug(slug: string): Promise<CardWithLinks | null> {
  const db = getDb();
  const card = await db.query.cards.findFirst({ where: eq(cards.slug, slug) });
  if (!card) return null;
  const links = await db
    .select()
    .from(cardLinks)
    .where(eq(cardLinks.cardId, card.id))
    .orderBy(asc(cardLinks.position));
  return { ...card, links };
}

/** Carte publique : active, liens visibles uniquement. */
export async function getPublicCard(slug: string): Promise<CardWithLinks | null> {
  const card = await getCardBySlug(slug);
  if (!card || !card.isActive) return null;
  return { ...card, links: card.links.filter((l) => l.isVisible) };
}

export async function getCardById(id: string): Promise<CardWithLinks | null> {
  const db = getDb();
  const card = await db.query.cards.findFirst({ where: eq(cards.id, id) });
  if (!card) return null;
  const links = await db
    .select()
    .from(cardLinks)
    .where(eq(cardLinks.cardId, id))
    .orderBy(asc(cardLinks.position));
  return { ...card, links };
}

export async function listCardsFor(actor: { id: string; role: "admin" | "member" }) {
  const db = getDb();
  const rows = await db
    .select({ card: cards, ownerEmail: users.email })
    .from(cards)
    .innerJoin(users, eq(users.id, cards.userId))
    .where(actor.role === "admin" ? undefined : eq(cards.userId, actor.id))
    .orderBy(asc(cards.kind), asc(cards.slug));
  const ids = rows.map((r) => r.card.id);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const views = ids.length
    ? await db
        .select({ cardId: events.cardId, n: count() })
        .from(events)
        .where(
          and(inArray(events.cardId, ids), eq(events.type, "view"), gte(events.createdAt, since)),
        )
        .groupBy(events.cardId)
    : [];
  const viewsBy = new Map(views.map((v) => [v.cardId, Number(v.n)]));
  return rows.map((r) => ({
    ...r.card,
    ownerEmail: r.ownerEmail,
    views30d: viewsBy.get(r.card.id) ?? 0,
  }));
}

export type EventType =
  "view" | "vcard_download" | "pass_generated" | "qr_download" | "contact_submitted";

export async function recordEvent(
  cardId: string,
  type: EventType,
  source: EventSource,
  headers: Headers,
): Promise<void> {
  await getDb()
    .insert(events)
    .values({ cardId, type, source, ipHash: hashIp(clientIp(headers)) });
}

/** Limitation de débit fondée sur la table events (N-06) : aucune infrastructure supplémentaire. */
export async function countRecentEvents(type: EventType, headers: Headers, windowMs: number) {
  const [row] = await getDb()
    .select({ n: count() })
    .from(events)
    .where(
      and(
        eq(events.type, type),
        eq(events.ipHash, hashIp(clientIp(headers))),
        gte(events.createdAt, new Date(Date.now() - windowMs)),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function latestEvents(cardId: string, limit = 20) {
  return getDb()
    .select()
    .from(events)
    .where(eq(events.cardId, cardId))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}
