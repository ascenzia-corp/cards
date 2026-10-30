/**
 * Authentification par lien magique (F-30) : Auth.js v5, adaptateur Drizzle, sessions en base de 30 jours.
 * Une adresse non autorisée reçoit exactement la même réponse qu'une adresse autorisée, sans e-mail.
 */
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { accounts, sessions, users, verificationTokens } from "./db/schema";
import { adminEmails, allowedEmailDomains, requireEnv } from "./env";
import { effectiveRole, isSignInAllowed, type Role } from "./authz";
import { actionEmail, sendMail } from "./mail";
import { t } from "./i18n";

const MAGIC_LINK_MAX_AGE = 24 * 60 * 60;
const MAGIC_LINKS_PER_HOUR = 3;
/** Même URL que la redirection d'Auth.js après un envoi réel : réponse indiscernable. */
export const NEUTRAL_REDIRECT = "/login/verifier?provider=resend&type=email";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; role: Role; isActive: boolean; name?: string | null };
  }
}

async function findUser(email: string) {
  const [user] = await getDb()
    .select({ id: users.id, isActive: users.isActive, role: users.role })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
    .limit(1);
  return user ?? null;
}

/** N-06 : 3 liens magiques par heure et par adresse, comptés sur les jetons émis. */
async function magicLinksSentLastHour(email: string): Promise<number> {
  const threshold = new Date(Date.now() + (MAGIC_LINK_MAX_AGE - 3600) * 1000);
  const [row] = await getDb()
    .select({ n: count() })
    .from(verificationTokens)
    .where(
      and(eq(verificationTokens.identifier, email), gt(verificationTokens.expires, threshold)),
    );
  return Number(row?.n ?? 0);
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const db = getDb();
  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    secret: requireEnv("AUTH_SECRET"),
    trustHost: true,
    session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
    pages: { signIn: "/login", verifyRequest: "/login/verifier", error: "/login/erreur" },
    providers: [
      Resend({
        apiKey: requireEnv("RESEND_API_KEY"),
        from: requireEnv("MAIL_FROM"),
        maxAge: MAGIC_LINK_MAX_AGE,
        async sendVerificationRequest({ identifier, url }) {
          const { html, text } = actionEmail({
            intro: t.auth.mailIntro,
            button: t.auth.mailButton,
            url,
            footer: t.auth.mailIgnore,
          });
          await sendMail({ to: identifier, subject: t.auth.mailSubject, html, text });
        },
      }),
    ],
    callbacks: {
      async signIn({ user, email }) {
        const address = user.email?.toLowerCase();
        if (!address) return false;
        const stored = await findUser(address);
        const allowed = isSignInAllowed({
          email: address,
          adminEmails: adminEmails(),
          allowedDomains: allowedEmailDomains(),
          user: stored,
        });
        if (email?.verificationRequest) {
          if (!allowed) return NEUTRAL_REDIRECT;
          if ((await magicLinksSentLastHour(address)) >= MAGIC_LINKS_PER_HOUR)
            return NEUTRAL_REDIRECT;
          return true;
        }
        return allowed;
      },
      async session({ session, user }) {
        const row = user as typeof user & { role?: Role; isActive?: boolean };
        session.user = {
          ...session.user,
          id: user.id,
          email: user.email,
          name: user.name,
          role: effectiveRole(user.email, row.role ?? "member", adminEmails()),
          isActive: row.isActive ?? true,
        };
        return session;
      },
    },
    events: {
      async signIn({ user }) {
        if (!user.id) return;
        const role = adminEmails().includes(user.email?.toLowerCase() ?? "") ? "admin" : undefined;
        await db
          .update(users)
          .set({ lastLoginAt: new Date(), ...(role ? { role } : {}) })
          .where(eq(users.id, user.id));
      },
    },
  };
});
