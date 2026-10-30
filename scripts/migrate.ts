/**
 * Applique les migrations Drizzle puis crée le bucket de stockage privé s'il manque.
 * Usage : pnpm db:migrate (lit .env.local, sinon l'environnement)
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL (ou DATABASE_URL_DIRECT) manquante.");
  const client = postgres(url, { max: 1, prepare: false });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
  console.log("Migrations appliquées.");

  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "cards-media";
  if (!supabaseUrl || !key) {
    console.warn("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absentes : bucket non vérifié.");
    return;
  }
  const storage = createClient(supabaseUrl, key, { auth: { persistSession: false } }).storage;
  const { data } = await storage.getBucket(bucket);
  if (data) {
    if (data.public) throw new Error(`Le bucket ${bucket} est public : il doit être privé.`);
    console.log(`Bucket ${bucket} présent (privé).`);
    return;
  }
  const { error } = await storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) throw error;
  console.log(`Bucket privé ${bucket} créé.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
