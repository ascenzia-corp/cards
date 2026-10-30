import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Connexion impossible", robots: { index: false } };

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">{t.auth.errorTitle}</h1>
      <p className="mt-3" style={{ color: "var(--fg-muted)" }}>
        {t.auth.errorBody}
      </p>
      <Link href="/login" className="btn btn-secondary mt-8 self-start">
        {t.auth.submit}
      </Link>
    </main>
  );
}
