/**
 * Crée l'administrateur et les deux cartes de Laurent (lot 1). Idempotent.
 * Seuls les champs connus sont renseignés : fonction, téléphone, photo et liens se complètent dans l'admin.
 * Usage : pnpm db:seed
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cards, users } from "../lib/db/schema";
import { passSerialFor } from "../lib/pass/pass-json";

config({ path: ".env.local" });
config();

const ADMIN = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim().toLowerCase();

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
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
