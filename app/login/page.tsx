import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { NEUTRAL_REDIRECT, signIn } from "@/lib/auth";
import { getActor } from "@/lib/session";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Connexion · Ascenzia Cards", robots: { index: false } };

async function requestLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!z.email().safeParse(email).success) redirect(NEUTRAL_REDIRECT);
  try {
    await signIn("resend", { email, redirectTo: "/admin" });
  } catch (e) {
    unstable_rethrow(e);
    // Toute autre erreur reçoit la même réponse neutre (F-30), et part au journal.
    console.error("Demande de lien magique", e);
    redirect(NEUTRAL_REDIRECT);
  }
}

export default async function LoginPage() {
  if (await getActor()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-4 py-16">
      <p
        className="text-xs font-semibold tracking-[0.08em] uppercase"
        style={{ color: "var(--fg-muted)" }}
      >
        Ascenzia Cards
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{t.auth.title}</h1>
      <p className="mt-2" style={{ color: "var(--fg-muted)" }}>
        {t.auth.intro}
      </p>
      <form action={requestLink} className="mt-8 grid gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          {t.auth.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="prenom.nom@ascenzia.fr"
          className="input"
        />
        <button type="submit" className="btn btn-gold mt-2">
          {t.auth.submit}
        </button>
      </form>
    </main>
  );
}
