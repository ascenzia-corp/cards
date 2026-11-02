import type { Metadata } from "next";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Vérifiez votre boîte mail", robots: { index: false } };

/** Message neutre identique pour une adresse autorisée ou non (F-30, R-12). */
export default function VerifyPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">{t.auth.checkTitle}</h1>
      <p className="mt-3" style={{ color: "var(--fg-muted)" }}>
        {t.auth.checkBody}
      </p>
    </main>
  );
}
