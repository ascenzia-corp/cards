import { t } from "@/lib/i18n";

/** 404 explicite : carte inexistante ou désactivée (F-34, F-38). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-4 py-16">
      <p
        className="text-xs font-semibold tracking-[0.08em] uppercase"
        style={{ color: "var(--fg-muted)" }}
      >
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{t.notFound.title}</h1>
      <p className="mt-2" style={{ color: "var(--fg-muted)" }}>
        {t.notFound.body}
      </p>
      <a href="https://ascenzia.ai" className="btn btn-secondary mt-8 self-start">
        {t.notFound.back}
      </a>
    </main>
  );
}
