import "server-only";
/** Opérations d'édition des cartes côté admin, partagées par les routes et les pages. */
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { applyCardUpdate, assertCanAccessCard, assertMediaAllowed, type Actor } from "./authz";
import type { CardUpdate } from "./card-schema";
import { getCardById } from "./cards";
import { getDb } from "./db";
import { cardLinks, cards, type CardWithLinks } from "./db/schema";
import { HttpError } from "./http";
import {
  mediaFolder,
  processBackground,
  processLogo,
  processPhoto,
  type MediaKind,
  type SquareCrop,
} from "./media";
import { putObject } from "./storage";
import { mediaUrl } from "./view-model";

export function toCardDto(card: CardWithLinks) {
  return {
    id: card.id,
    kind: card.kind,
    slug: card.slug,
    isActive: card.isActive,
    firstName: card.firstName,
    lastName: card.lastName,
    title: card.title,
    company: card.company,
    tagline: card.tagline,
    phone: card.phone,
    email: card.email,
    website: card.website,
    address: card.address,
    themeId: card.themeId,
    accentColor: card.accentColor,
    photoPath: card.photoPath,
    logoPath: card.logoPath,
    backgroundPath: card.backgroundPath,
    photoUrl: mediaUrl(card.slug, "photo.webp", card.photoPath),
    logoUrl: mediaUrl(card.slug, "logo.png", card.logoPath),
    backgroundUrl: mediaUrl(card.slug, "background.webp", card.backgroundPath),
    links: card.links.map(({ kind, label, url, isVisible }) => ({ kind, label, url, isVisible })),
    passGeneratedAt: card.passGeneratedAt?.toISOString() ?? null,
    updatedAt: card.updatedAt.toISOString(),
    // F-36 : pass installé périmé si la carte a changé depuis la dernière génération
    passStale: card.passGeneratedAt !== null && card.updatedAt > card.passGeneratedAt,
  };
}
export type CardDto = ReturnType<typeof toCardDto>;

export async function loadCardFor(actor: Actor, id: string): Promise<CardWithLinks> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Carte introuvable.");
  const card = await getCardById(id);
  if (!card) throw new HttpError(404, "Carte introuvable.");
  assertCanAccessCard(actor, card);
  return card;
}

function revalidateCard(...slugs: string[]) {
  for (const slug of new Set(slugs)) revalidatePath(`/${slug}`);
}

export async function updateCard(
  actor: Actor,
  id: string,
  input: CardUpdate,
): Promise<CardWithLinks> {
  const card = await loadCardFor(actor, id);
  const { values, links } = applyCardUpdate(actor, card, input);
  const db = getDb();
  if (values.slug !== card.slug) {
    const clash = await db.query.cards.findFirst({ where: eq(cards.slug, values.slug) });
    if (clash) throw new HttpError(409, "Ce slug est déjà utilisé.");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(cards)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(cards.id, id));
    await tx.delete(cardLinks).where(eq(cardLinks.cardId, id));
    if (links.length) await tx.insert(cardLinks).values(links.map((l) => ({ ...l, cardId: id })));
  });
  revalidateCard(card.slug, values.slug);
  return (await getCardById(id))!;
}

const PROCESSORS = {
  photo: processPhoto,
  logo: processLogo,
  background: processBackground,
} as const;
const COLUMNS = { photo: "photoPath", logo: "logoPath", background: "backgroundPath" } as const;

export async function uploadMedia(
  actor: Actor,
  id: string,
  kind: MediaKind,
  file: Buffer,
  crop?: SquareCrop,
): Promise<CardWithLinks> {
  const card = await loadCardFor(actor, id);
  assertMediaAllowed(card, kind);
  const variants = kind === "photo" ? await processPhoto(file, crop) : await PROCESSORS[kind](file);
  const folder = mediaFolder(card.id, kind);
  await Promise.all(
    Object.entries(variants).map(([name, [buf, type]]) =>
      putObject(`${folder}/${name}`, buf, type),
    ),
  );
  await getDb()
    .update(cards)
    .set({ [COLUMNS[kind]]: folder, updatedAt: new Date() })
    .where(eq(cards.id, id));
  revalidateCard(card.slug);
  return (await getCardById(id))!;
}

export async function removeMedia(
  actor: Actor,
  id: string,
  kind: MediaKind,
): Promise<CardWithLinks> {
  const card = await loadCardFor(actor, id);
  assertMediaAllowed(card, kind);
  await getDb()
    .update(cards)
    .set({ [COLUMNS[kind]]: null, updatedAt: new Date() })
    .where(eq(cards.id, id));
  revalidateCard(card.slug);
  return (await getCardById(id))!;
}
