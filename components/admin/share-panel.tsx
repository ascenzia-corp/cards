"use client";
/** Onglet Partage (parcours admin, étape 4) : lien, QR PNG/SVG, pass Wallet, vCard, tag NFC. */
import { useState } from "react";
import { Check, Copy, Download, Wallet } from "lucide-react";

export function SharePanel({
  slug,
  baseUrl,
  isActive,
}: {
  slug: string;
  baseUrl: string;
  isActive: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${baseUrl}/${slug}`;
  const qr = (format: "png" | "svg", logo: boolean) =>
    `/api/cards/${slug}/qr?format=${format}${logo ? "&logo=1" : ""}&download=1`;

  if (!isActive)
    return <p className="panel p-4 text-sm">Carte désactivée : aucun partage possible.</p>;

  return (
    <div className="grid gap-6">
      <section className="panel grid gap-3 p-4">
        <p className="eyebrow">Lien de la carte</p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="text-sm break-all">{url}</code>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? (
              <Check aria-hidden="true" size={16} />
            ) : (
              <Copy aria-hidden="true" size={16} />
            )}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      </section>

      <section className="panel grid gap-4 p-4 sm:grid-cols-[200px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/cards/${slug}/qr?format=png&logo=1`}
          alt={`QR code de ${url}`}
          width={200}
          height={200}
          className="rounded-lg bg-white"
        />
        <div className="grid content-start gap-3">
          <p className="eyebrow">QR code (correction M, URL suivie ?src=qr)</p>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-secondary btn-sm" href={qr("png", true)}>
              <Download aria-hidden="true" size={16} />
              PNG avec logo
            </a>
            <a className="btn btn-secondary btn-sm" href={qr("png", false)}>
              <Download aria-hidden="true" size={16} />
              PNG sans logo
            </a>
            <a className="btn btn-secondary btn-sm" href={qr("svg", true)}>
              <Download aria-hidden="true" size={16} />
              SVG avec logo
            </a>
            <a className="btn btn-secondary btn-sm" href={qr("svg", false)}>
              <Download aria-hidden="true" size={16} />
              SVG sans logo
            </a>
          </div>
        </div>
      </section>

      <section className="panel grid gap-3 p-4">
        <p className="eyebrow">Apple Wallet et contact</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-secondary btn-sm" href={`/api/cards/${slug}/pass`}>
            <Wallet aria-hidden="true" size={16} />
            Télécharger le pass (.pkpass)
          </a>
          <a className="btn btn-secondary btn-sm" href={`/api/cards/${slug}/vcard`}>
            <Download aria-hidden="true" size={16} />
            vCard (.vcf)
          </a>
        </div>
        <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
          Sur iPhone, ouvrez ce lien dans Safari : la feuille « Ajouter » de Wallet s&apos;ouvre
          directement. Le pass remplace l&apos;ancien grâce à son numéro de série stable.
        </p>
      </section>

      <section className="panel grid gap-2 p-4 text-sm">
        <p className="eyebrow">Tag NFC</p>
        <p>
          Encodez l&apos;URL <code className="break-all">{url}?src=nfc</code> sur un tag NTAG213 ou
          NTAG215, avec une app comme NFC Tools (enregistrement « URL »). Aucun logiciel NFC
          n&apos;est fourni par l&apos;application.
        </p>
      </section>
    </div>
  );
}
