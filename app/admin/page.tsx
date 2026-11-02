import { TriangleAlert } from "lucide-react";
import { listCardsFor } from "@/lib/cards";
import { passCertificateStatus } from "@/lib/pass/certificates";
import { requireActor } from "@/lib/session";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

function CertificateBanner() {
  const status = passCertificateStatus();
  if (status.state === "ok" && status.daysLeft > 30) {
    return (
      <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
        Certificat de pass valide jusqu&apos;au {dateFmt.format(status.notAfter)}.
      </p>
    );
  }
  const message =
    status.state === "missing"
      ? `Pass Apple Wallet indisponible : variable ${status.missing} manquante (section 6 du cahier des charges).`
      : status.state === "invalid"
        ? `Certificat de pass illisible : ${status.error}`
        : status.daysLeft < 0
          ? `Le certificat de pass a expiré le ${dateFmt.format(status.notAfter)}. Les nouveaux pass ne peuvent plus être générés.`
          : `Le certificat de pass expire le ${dateFmt.format(status.notAfter)} (dans ${status.daysLeft} jours). Renouvelez-le (voir README).`;
  return (
    <div role="status" className="panel flex items-start gap-3 p-4 text-sm">
      <TriangleAlert
        aria-hidden="true"
        size={20}
        strokeWidth={1.6}
        className="shrink-0 text-gold-600"
      />
      <p>{message}</p>
    </div>
  );
}

export default async function AdminHome() {
  const actor = await requireActor();
  const cards = await listCardsFor(actor);
  return (
    <main className="grid gap-6">
      <div>
        <p className="eyebrow">{actor.role === "admin" ? "Toutes les cartes" : "Ma carte"}</p>
        <h1 className="mt-1 text-2xl font-semibold">Cartes de visite</h1>
      </div>
      {actor.role === "admin" ? <CertificateBanner /> : null}
      {cards.length === 0 ? (
        <p style={{ color: "var(--fg-muted)" }}>Aucune carte pour le moment.</p>
      ) : (
        <ul className="grid gap-3">
          {cards.map((c) => {
            const stale = c.passGeneratedAt !== null && c.updatedAt > c.passGeneratedAt;
            return (
              <li key={c.id}>
                <a
                  href={`/admin/cards/${c.id}`}
                  className="panel flex flex-wrap items-center gap-x-6 gap-y-2 p-4 hover:bg-[var(--surface-hover)]"
                >
                  <div className="min-w-[220px] flex-1">
                    <p className="font-semibold">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                      /{c.slug} · {c.kind === "ascenzia" ? "Carte Ascenzia" : "Carte perso"}
                      {actor.role === "admin" ? ` · ${c.ownerEmail}` : ""}
                    </p>
                  </div>
                  <dl className="grid grid-cols-3 gap-6 text-sm">
                    <div>
                      <dt className="eyebrow">Statut</dt>
                      <dd>{c.isActive ? "Active" : "Inactive"}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Dernier pass</dt>
                      <dd>
                        {c.passGeneratedAt ? dateFmt.format(c.passGeneratedAt) : "Jamais"}
                        {stale ? <span className="ml-1 text-gold-600">· à régénérer</span> : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Vues 30 j</dt>
                      <dd>{c.views30d}</dd>
                    </div>
                  </dl>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
