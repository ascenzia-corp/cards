/**
 * Face de carte de la page publique aux couleurs de la charte Ascenzia (gabarit D1) : logo en haut
 * à gauche, nom en League Spartan or, étiquettes en capitales, beaucoup de vide, aucune ombre.
 * Logo : celui de la carte s'il existe, posé sur une pastille claire pour rester lisible sur le
 * fond sombre ; sinon le logo Ascenzia clair. Sans dépendance aux polices : testable seul.
 */
import { t } from "@/lib/i18n";
import type { CardViewModel } from "@/lib/view-model";

export const ASCENZIA_LOGO_DARK_BG = "/brand/ascenzia-logo-fond-sombre.svg";

export function CharteLogo({ logoUrl }: { logoUrl: string | null }) {
  if (logoUrl)
    return (
      <span className="charte-logo-chip" data-logo="card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="charte-logo-card" />
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ASCENZIA_LOGO_DARK_BG}
      alt="Ascenzia"
      width={150}
      height={45}
      className="charte-logo"
      data-logo="ascenzia"
    />
  );
}

export function CharteCardFace({ card }: { card: CardViewModel }) {
  return (
    <header className="charte-face" aria-label={t.public.cardOf(card.name)}>
      <CharteLogo logoUrl={card.logoUrl} />
      <div className="charte-identity">
        {card.photoUrl ? (
          <span className="charte-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.photoUrl}
              alt={t.public.photoAlt(card.name)}
              width={88}
              height={88}
              fetchPriority="high"
            />
          </span>
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
