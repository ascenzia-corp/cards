/** Règles de slug (F-01). */

export const SLUG_RE = /^[a-z0-9.-]{3,40}$/;
/** Forme prenom.nom pour une carte Ascenzia ; un chiffre final départage les homonymes (prenom.nom2). */
export const ASCENZIA_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Chemins réservés par l'application : aucune carte ne peut les occuper. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "aide",
  "login",
  "logout",
  "auth",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "brand",
  "wallet",
  "fonts",
  "mentions",
  "_next",
]);

export type CardKind = "ascenzia" | "personal";

export function slugify(part: string): string {
  return part
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug proposé depuis prénom et nom : « Jean-Éric Le Gall » → « jean-eric.le-gall ». */
export function suggestSlug(firstName: string, lastName: string): string {
  return [slugify(firstName), slugify(lastName)].filter(Boolean).join(".");
}

export function validateSlug(slug: string, kind: CardKind): string | null {
  if (!SLUG_RE.test(slug))
    return "Le slug doit faire 3 à 40 caractères parmi a-z, 0-9, point et tiret.";
  if (RESERVED_SLUGS.has(slug)) return "Ce slug est réservé par l'application.";
  if (kind === "ascenzia" && !ASCENZIA_SLUG_RE.test(slug))
    return "Une carte Ascenzia utilise la forme prenom.nom (ex. laurent.fontaine).";
  return null;
}
