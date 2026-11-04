/**
 * Rendu de la carte (section 10). Composant pur, sans état : utilisé par la page publique
 * (rendu serveur) et par l'aperçu en direct de l'admin (rendu client).
 */
import { ChevronRight, Mail, MapPin, Phone, UserPlus } from "lucide-react";
import { brandFontVariables } from "@/lib/fonts";
import { t } from "@/lib/i18n";
import type { CardViewModel } from "@/lib/view-model";
import { LinkIconFor } from "./link-icon";

export function CardFace({ card, charte = false }: { card: CardViewModel; charte?: boolean }) {
  const { theme } = card;
  if (charte) return <CharteCardFace card={card} />;
  return (
    <article
      className={`card-face ${theme.brandFonts ? `${brandFontVariables} brand-fonts` : ""}`}
      style={{ background: theme.cardBackground, color: theme.text, textShadow: theme.textShadow }}
      aria-label={t.public.cardOf(card.name)}
    >
      {theme.brandLogo || card.logoUrl ? (
        <div className="mb-6 flex min-h-6 items-center justify-between">
          {theme.brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/ascenzia-logo-white.svg"
              alt="Ascenzia"
              width={100}
              height={30}
              className="h-[30px] w-auto"
            />
          ) : card.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.logoUrl} alt="" className="h-7 w-auto max-w-[140px] object-contain" />
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        {card.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.photoUrl}
            alt={t.public.photoAlt(card.name)}
            width={96}
            height={96}
            fetchPriority="high"
            className="h-24 w-24 shrink-0 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 2px ${theme.highlight}33` }}
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="card-name text-[1.625rem] leading-tight font-semibold tracking-[-0.01em] break-words">
            {card.name}
          </h1>
          {card.title ? (
            <p className="mt-1 text-[0.95rem] leading-snug" style={{ color: theme.highlight }}>
              {card.title}
            </p>
          ) : null}
          {card.company ? (
            <p
              className="card-label mt-1 text-xs font-semibold tracking-[0.08em] uppercase"
              style={{ color: theme.muted }}
            >
              {card.company}
            </p>
          ) : null}
        </div>
      </div>

      {card.tagline ? (
        <p className="mt-5 truncate text-sm" style={{ color: theme.muted }} title={card.tagline}>
          {card.tagline}
        </p>
      ) : null}
    </article>
  );
}

/**
 * Face de carte aux couleurs de la charte Ascenzia (gabarit D1) : logo fond sombre en haut à
 * gauche, nom en League Spartan or, étiquettes en capitales, beaucoup de vide, aucune ombre.
 */
function CharteCardFace({ card }: { card: CardViewModel }) {
  return (
    <header className="charte-face" aria-label={t.public.cardOf(card.name)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/ascenzia-logo-fond-sombre.svg"
        alt="Ascenzia"
        width={150}
        height={45}
        className="charte-logo"
      />
      <div className="charte-identity">
        {card.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.photoUrl}
            alt={t.public.photoAlt(card.name)}
            width={88}
            height={88}
            fetchPriority="high"
            className="charte-photo"
          />
        ) : null}
        {card.company ? <p className="charte-label">{card.company}</p> : null}
        <h1 className="charte-name">{card.name}</h1>
        <span className="charte-rule" aria-hidden="true" />
        {card.title ? <p className="charte-title">{card.title}</p> : null}
        {card.tagline ? (
          <p className="charte-tagline" title={card.tagline}>
            {card.tagline}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export function PrimaryActions({
  card,
  interactive = true,
  walletSlot,
  charte = false,
}: {
  card: CardViewModel;
  interactive?: boolean;
  walletSlot?: React.ReactNode;
  charte?: boolean;
}) {
  const vcardHref = `/api/cards/${card.slug}/vcard`;
  const disabled = interactive
    ? {}
    : { tabIndex: -1, "aria-hidden": true as const, onClick: undefined };
  return (
    <div className="mt-4 grid gap-3">
      <a
        href={interactive ? vcardHref : undefined}
        className="btn btn-primary"
        style={charte ? undefined : { background: card.theme.buttonBg, color: card.theme.buttonFg }}
        {...disabled}
      >
        <UserPlus aria-hidden="true" size={20} strokeWidth={1.6} />
        {t.public.saveContact}
      </a>
      {card.phone || card.email ? (
        <div className={`grid gap-3 ${card.phone && card.email ? "grid-cols-2" : "grid-cols-1"}`}>
          {card.phone ? (
            <a
              href={interactive ? `tel:${card.phone}` : undefined}
              className="btn btn-secondary"
              {...disabled}
            >
              <Phone aria-hidden="true" size={20} strokeWidth={1.6} />
              {t.public.call}
            </a>
          ) : null}
          {card.email ? (
            <a
              href={interactive ? `mailto:${card.email}` : undefined}
              className="btn btn-secondary"
              {...disabled}
            >
              <Mail aria-hidden="true" size={20} strokeWidth={1.6} />
              {t.public.email}
            </a>
          ) : null}
        </div>
      ) : null}
      {walletSlot}
    </div>
  );
}

export function LinkList({
  card,
  interactive = true,
}: {
  card: CardViewModel;
  interactive?: boolean;
}) {
  const rows: {
    key: string;
    icon: React.ReactNode;
    label: string;
    detail?: string;
    href?: string;
  }[] = [];
  if (card.website)
    rows.push({
      key: "website",
      icon: <LinkIconFor kind="website" />,
      label: t.public.website,
      detail: card.websiteDisplay ?? undefined,
      href: card.website,
    });
  card.links.forEach((l, i) =>
    rows.push({ key: `l${i}`, icon: <LinkIconFor kind={l.kind} />, label: l.label, href: l.url }),
  );
  if (card.addressLines.length)
    rows.push({
      key: "address",
      icon: <MapPin aria-hidden="true" size={20} strokeWidth={1.6} />,
      label: t.public.address,
      detail: card.addressLines.join(", "),
    });
  if (!rows.length) return null;
  return (
    <ul className="link-list mt-6" aria-label={t.public.links}>
      {rows.map((r) => {
        const content = (
          <>
            <span className="link-icon">{r.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{r.label}</span>
              {r.detail ? (
                <span className="link-detail block truncate text-sm">{r.detail}</span>
              ) : null}
            </span>
            {r.href ? (
              <ChevronRight
                aria-hidden="true"
                size={20}
                strokeWidth={1.6}
                className="link-chevron"
              />
            ) : null}
          </>
        );
        return (
          <li key={r.key}>
            {r.href && interactive ? (
              <a href={r.href} target="_blank" rel="noopener noreferrer" className="link-row">
                {content}
              </a>
            ) : (
              <div className="link-row">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
