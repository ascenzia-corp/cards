/** Données d'affichage d'une carte, partagées par la page publique et l'aperçu de l'admin. */
import type { LinkKind } from "./card-schema";
import type { CardAddress, CardWithLinks } from "./db/schema";
import { mediaVersion } from "./media-path";
import { formatPhone } from "./phone";
import { resolveTheme, type ResolvedTheme } from "./themes";
import type { CardKind } from "./slug";

export interface CardViewModel {
  kind: CardKind;
  slug: string;
  name: string;
  title: string | null;
  company: string | null;
  tagline: string | null;
  phone: string | null;
  phoneDisplay: string | null;
  email: string | null;
  website: string | null;
  websiteDisplay: string | null;
  addressLines: string[];
  links: { kind: LinkKind; label: string; url: string }[];
  photoUrl: string | null;
  logoUrl: string | null;
  theme: ResolvedTheme;
}

export function mediaUrl(
  slug: string,
  file: string,
  folder: string | null | undefined,
): string | null {
  const v = mediaVersion(folder);
  return v ? `/api/cards/${slug}/media/${file}?v=${v}` : null;
}

export function addressLines(a: CardAddress | null | undefined): string[] {
  if (!a) return [];
  return [a.street, [a.postalCode, a.city].filter(Boolean).join(" "), a.country].filter(
    (l): l is string => !!l && l.trim() !== "",
  );
}

export function displayUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

export function toViewModel(
  card: Pick<
    CardWithLinks,
    | "kind"
    | "slug"
    | "firstName"
    | "lastName"
    | "title"
    | "company"
    | "tagline"
    | "phone"
    | "email"
    | "website"
    | "address"
    | "photoPath"
    | "logoPath"
    | "backgroundPath"
    | "themeId"
    | "accentColor"
  > & { links: { kind: LinkKind; label: string; url: string; isVisible?: boolean }[] },
  overrides: {
    photoUrl?: string | null;
    logoUrl?: string | null;
    backgroundUrl?: string | null;
  } = {},
): CardViewModel {
  const isAscenzia = card.kind === "ascenzia";
  const backgroundUrl =
    overrides.backgroundUrl !== undefined
      ? overrides.backgroundUrl
      : mediaUrl(card.slug, "background.webp", card.backgroundPath);
  return {
    kind: card.kind,
    slug: card.slug,
    name: [card.firstName, card.lastName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" "),
    title: card.title || null,
    company: isAscenzia ? "Ascenzia" : card.company || null,
    tagline: card.tagline || null,
    phone: card.phone || null,
    phoneDisplay: card.phone ? formatPhone(card.phone) : null,
    email: card.email || null,
    website: card.website || null,
    websiteDisplay: card.website ? displayUrl(card.website) : null,
    addressLines: addressLines(card.address),
    links: card.links
      .filter((l) => l.isVisible !== false && l.url)
      .map(({ kind, label, url }) => ({ kind, label, url })),
    photoUrl:
      overrides.photoUrl !== undefined
        ? overrides.photoUrl
        : mediaUrl(card.slug, "photo.webp", card.photoPath),
    logoUrl: isAscenzia
      ? null
      : overrides.logoUrl !== undefined
        ? overrides.logoUrl
        : mediaUrl(card.slug, "logo.png", card.logoPath),
    theme: resolveTheme({
      kind: card.kind,
      themeId: card.themeId,
      accentColor: card.accentColor,
      backgroundUrl,
    }),
  };
}
