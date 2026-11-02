import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante pour les tests e2e.");
  return postgres(url, { max: 1, prepare: false });
}

export const MEMBER_EMAIL = "e2e.membre@ascenzia.fr";
