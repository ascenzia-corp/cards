import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireEnv } from "../env";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __cardsDb?: Db };

/** Connexion paresseuse : le build ne requiert pas DATABASE_URL. */
export function getDb(): Db {
  if (!globalForDb.__cardsDb) {
    const client = postgres(requireEnv("DATABASE_URL"), {
      // Pooler Supabase en mode transaction : pas de requêtes préparées
      prepare: false,
      max: 5,
    });
    globalForDb.__cardsDb = drizzle(client, { schema });
  }
  return globalForDb.__cardsDb;
}

export { schema };
