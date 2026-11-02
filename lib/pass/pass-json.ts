/**
 * Construction du pass.json (section 6). Fonction pure, testable sans certificat.
 */
import { resolveTheme } from "../themes";
import type { CardKind } from "../slug";

export interface PassCardInput {
  kind: CardKind;
  slug: string;
  passSerial: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  company?: string | null;
  tagline?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: { street?: string; postalCode?: string; city?: string; country?: string } | null;
  links?: { label: string; url: string }[];
  themeId?: string | null;
  accentColor?: string | null;
}

export interface PassConfig {
  teamIdentifier: string;
  passTypeIdentifier: string;
  /** https://cards.ascenzia.ai */
  baseUrl: string;
}

type Field = { key: string; label?: string; value: string };

function nonEmpty(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function fullName(card: { firstName: string; lastName: string }): string {
  return [card.firstName.trim(), card.lastName.trim()].filter(Boolean).join(" ");
}

/** Numéro de série stable dérivé du slug à la création (ex. card-laurent.fontaine). */
export function passSerialFor(slug: string): string {
  return `card-${slug}`;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function buildPassJson(card: PassCardInput, config: PassConfig, now = new Date()) {
  const name = fullName(card);
  const theme = resolveTheme({
    kind: card.kind,
    themeId: card.themeId,
    accentColor: card.accentColor,
  });
  const cardUrl = `${config.baseUrl}/${card.slug}`;
  const shortUrl = cardUrl.replace(/^https?:\/\//, "");
  const isAscenzia = card.kind === "ascenzia";
  const company = isAscenzia ? "Ascenzia" : card.company;

  const secondaryFields: Field[] = [];
  if (nonEmpty(card.title))
    secondaryFields.push({ key: "title", label: "Fonction", value: card.title });
  if (nonEmpty(company)) secondaryFields.push({ key: "company", label: "Société", value: company });

  const auxiliaryFields: Field[] = [];
  if (nonEmpty(card.phone))
    auxiliaryFields.push({ key: "phone", label: "Téléphone", value: card.phone });
  if (nonEmpty(card.email))
    auxiliaryFields.push({ key: "email", label: "E-mail", value: card.email });

  const backFields: Field[] = [];
  if (nonEmpty(card.phone))
    backFields.push({ key: "back-phone", label: "Téléphone", value: card.phone });
  if (nonEmpty(card.email))
    backFields.push({ key: "back-email", label: "E-mail", value: card.email });
  if (nonEmpty(card.website))
    backFields.push({ key: "back-website", label: "Site web", value: card.website });
  (card.links ?? [])
    .filter((l) => nonEmpty(l.url))
    .forEach((l, i) =>
      backFields.push({ key: `back-link-${i}`, label: l.label || "Lien", value: l.url }),
    );
  const a = card.address;
  const addressLines = a
    ? [a.street, [a.postalCode, a.city].filter(nonEmpty).join(" "), a.country].filter(nonEmpty)
    : [];
  if (addressLines.length)
    backFields.push({ key: "back-address", label: "Adresse", value: addressLines.join("\n") });
  if (nonEmpty(card.tagline))
    backFields.push({ key: "back-tagline", label: "", value: card.tagline });
  backFields.push({ key: "back-card", label: "Carte en ligne", value: cardUrl });
  backFields.push({
    key: "back-generated",
    label: "Pass généré le",
    value: dateFormatter.format(now),
  });

  return {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    serialNumber: card.passSerial,
    organizationName: isAscenzia ? "Ascenzia" : name,
    description: `Carte de visite de ${name}`,
    logoText: isAscenzia ? "Ascenzia" : name,
    backgroundColor: theme.pass.backgroundColor,
    foregroundColor: theme.pass.foregroundColor,
    labelColor: theme.pass.labelColor,
    sharingProhibited: false,
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: `${cardUrl}?src=wallet`,
        messageEncoding: "iso-8859-1",
        altText: shortUrl,
      },
    ],
    generic: {
      primaryFields: [{ key: "name", label: "", value: name }],
      secondaryFields,
      auxiliaryFields,
      backFields,
    },
  };
}

export type PassJson = ReturnType<typeof buildPassJson>;
