import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";
import { requireActor } from "@/lib/session";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Admin · Ascenzia Cards", robots: { index: false } };

async function doSignOut() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--page-bg) 85%, transparent)" }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/favicon.svg" alt="" width={24} height={24} className="dark:hidden" />
            Ascenzia Cards
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline" style={{ color: "var(--fg-muted)" }}>
              {actor.email} · {actor.role === "admin" ? "admin" : "membre"}
            </span>
            <form action={doSignOut}>
              <button
                type="submit"
                className="btn btn-secondary btn-sm"
                aria-label={t.auth.signOut}
              >
                <LogOut aria-hidden="true" size={16} strokeWidth={1.6} />
                <span className="hidden sm:inline">{t.auth.signOut}</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1200px] px-4 pt-4 pb-16">{children}</div>
    </div>
  );
}
