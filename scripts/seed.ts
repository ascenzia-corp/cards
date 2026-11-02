/**
 * Crée l'administrateur et les deux cartes de Laurent (lot 1), avec le contenu de sa signature
 * (fonction, téléphone, liens, photo, logo). Idempotent : un champ déjà renseigné (par exemple
 * depuis l'admin) n'est jamais écrasé.
 * Usage : pnpm db:seed
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cardLinks, cards, users } from "../lib/db/schema";
import { mediaFolder, processLogo, processPhoto, type Variants } from "../lib/media";
import { passSerialFor } from "../lib/pass/pass-json";
import { putObject } from "../lib/storage";

config({ path: ".env.local" });
config();

const ADMIN = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim().toLowerCase();

/** Contenu repris de la signature de Laurent (liens copiés tels quels). */
const SIGNATURE = {
  title: "Chief Product & Technology Officer",
  phone: "+33769691313", // affiché « +33 7 69 69 13 13 », lien tel:+33769691313
  photoUrl:
    "https://146302329.fs1.hubspotusercontent-eu1.net/hubfs/146302329/Corporate/Team/2506%20-%20LFO.png",
  logoUrl: "https://www.ascenzia.fr/hubfs/Corporate/Logos/PNG/logo_ascenzia_fond_clair.png",
  links: [
    {
      kind: "linkedin" as const,
      label: "LinkedIn",
      url: "https://www.linkedin.com/company/ascenzia",
    },
    { kind: "x" as const, label: "X", url: "https://x.com/ascenz_ia" },
    // Pas de type YouTube dans l'énumération : lien libre
    { kind: "custom" as const, label: "YouTube", url: "https://www.youtube.com/@Ascenzia_AI" },
  ],
};

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Même traitement que l'upload de l'admin (variantes, stockage). Un échec réseau n'arrête pas le seed. */
async function seedMedia(
  card: { id: string; slug: string },
  kind: "photo" | "logo",
  url: string,
): Promise<string | null> {
  try {
    const file = await download(url);
    const variants: Variants =
      kind === "photo" ? await processPhoto(file) : await processLogo(file);
    const folder = mediaFolder(card.id, kind);
    await Promise.all(
      Object.entries(variants).map(([name, [buf, type]]) =>
        putObject(`${folder}/${name}`, buf, type),
      ),
    );
    return folder;
  } catch (e) {
    console.warn(
      `/${card.slug} : ${kind} non importé (${(e as Error).message}) — à ajouter dans l'admin.`,
    );
    return null;
  }
}

type Db = ReturnType<typeof drizzle>;

/** Complète fonction, téléphone, liens, photo et logo, uniquement là où le champ est encore vide. */
async function fillSignature(db: Db, slug: string, kind: "ascenzia" | "personal") {
  const [card] = await db.select().from(cards).where(eq(cards.slug, slug));
  if (!card) throw new Error(`Carte /${slug} introuvable après insertion.`);
  const patch: Partial<typeof cards.$inferInsert> = {};
  if (!card.title) patch.title = SIGNATURE.title;
  if (!card.phone) patch.phone = SIGNATURE.phone;
  if (!card.photoPath) {
    const folder = await seedMedia(card, "photo", SIGNATURE.photoUrl);
    if (folder) patch.photoPath = folder;
  }
  // Le logo d'une carte Ascenzia est celui de la charte (assertMediaAllowed) : carte personnelle seulement
  if (kind === "personal" && !card.logoPath) {
    const folder = await seedMedia(card, "logo", SIGNATURE.logoUrl);
    if (folder) patch.logoPath = folder;
  }
  if (Object.keys(patch).length) {
    await db
      .update(cards)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(cards.id, card.id));
  }
  const existing = await db
    .select({ id: cardLinks.id })
    .from(cardLinks)
    .where(eq(cardLinks.cardId, card.id));
  if (existing.length === 0) {
    await db
      .insert(cardLinks)
      .values(SIGNATURE.links.map((l, position) => ({ ...l, cardId: card.id, position })));
  }
}

async function main() {
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante.");
  if (!ADMIN) throw new Error("ADMIN_EMAILS manquante.");
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  await db
    .insert(users)
    .values({
      email: ADMIN,
      role: "admin",
      displayName: "Laurent Fontaine",
      name: "Laurent Fontaine",
    })
    .onConflictDoNothing();
  const [admin] = await db.select().from(users).where(eq(users.email, ADMIN));
  if (!admin) throw new Error("Administrateur introuvable après insertion.");

  const seeds = [
    {
      kind: "ascenzia" as const,
      slug: "laurent.fontaine",
      themeId: "ascenzia",
      company: "Ascenzia",
      email: ADMIN,
      website: "https://ascenzia.ai/",
      accentColor: null,
    },
    {
      kind: "personal" as const,
      slug: "laurent",
      themeId: "ink",
      company: null,
      email: null,
      website: null,
      accentColor: "#ddac63",
    },
  ];
  for (const s of seeds) {
    const inserted = await db
      .insert(cards)
      .values({
        ...s,
        userId: admin.id,
        firstName: "Laurent",
        lastName: "Fontaine",
        passSerial: passSerialFor(s.slug),
      })
      .onConflictDoNothing()
      .returning({ slug: cards.slug });
    console.log(inserted.length ? `Carte /${s.slug} créée.` : `Carte /${s.slug} déjà présente.`);
    await fillSignature(db, s.slug, s.kind);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
