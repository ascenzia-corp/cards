import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { MEMBER_EMAIL, sql } from "./db";

/** Crée une session admin et une session membre de test, valables 1 heure. */
export default async function globalSetup() {
  const db = sql();
  const admin = (process.env.ADMIN_EMAILS ?? "").split(",")[0]!.trim().toLowerCase();
  await db`insert into users (email, role) values (${MEMBER_EMAIL}, 'member') on conflict do nothing`;
  const tokens: Record<string, string> = {};
  for (const [key, email] of [
    ["admin", admin],
    ["member", MEMBER_EMAIL],
  ] as const) {
    const token = randomBytes(24).toString("hex");
    await db`insert into sessions (session_token, user_id, expires)
      select ${token}, id, now() + interval '1 hour' from users where lower(email) = ${email}`;
    tokens[key] = token;
  }
  await db.end();
  writeFileSync("test-results-sessions.json", JSON.stringify(tokens));
}
