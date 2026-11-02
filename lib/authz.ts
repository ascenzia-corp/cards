/**
 * Règles de droits (F-30, F-31, F-33, R-09), indépendantes du framework pour être testées seules.
 */
import type { CardUpdate } from "./card-schema";
import type { CardKind } from "./slug";
import { validateSlug } from "./slug";
import { validateThemeSettings } from "./themes";

export type Role = "admin" | "member";

export interface Actor {
  id: string;
  email: string;
  role: Role;
}

export interface CardRef {
  id: string;
  userId: string;
  kind: CardKind;
  slug: string;
  themeId: string;
  accentColor: string | null;
}

export class ForbiddenError extends Error {
  readonly status = 403;
}
export class ValidationError extends Error {
  readonly status = 422;
  constructor(public readonly fields: Record<string, string>) {
    super(Object.values(fields).join(" "));
  }
}

export function canAccessCard(actor: Actor, card: Pick<CardRef, "userId">): boolean {
  return actor.role === "admin" || card.userId === actor.id;
}

export function assertCanAccessCard(actor: Actor, card: Pick<CardRef, "userId">): void {
  if (!canAccessCard(actor, card)) throw new ForbiddenError("Accès refusé à cette carte.");
}

/** Rôle effectif : une adresse listée dans ADMIN_EMAILS est admin, quelle que soit la base. */
export function effectiveRole(email: string, storedRole: Role, adminEmails: string[]): Role {
  return adminEmails.includes(email.toLowerCase()) ? "admin" : storedRole;
}

/** Autorisation d'envoi d'un lien magique (F-30). */
export function isSignInAllowed(params: {
  email: string;
  adminEmails: string[];
  allowedDomains: string[];
  user: { isActive: boolean } | null;
}): boolean {
  const email = params.email.toLowerCase();
  if (params.adminEmails.includes(email)) return params.user ? params.user.isActive : true;
  const domain = email.split("@")[1] ?? "";
  if (!params.allowedDomains.includes(domain)) return false;
  return params.user !== null && params.user.isActive;
}

/**
 * Applique une mise à jour validée par Zod à une carte, en appliquant les verrous :
 * - carte Ascenzia : thème, slug et accent refusés, société forcée à « Ascenzia » ;
 * - membre : uniquement sa carte, slug non modifiable ;
 * - carte perso : contraste 4,5:1 vérifié côté serveur.
 */
export function applyCardUpdate(actor: Actor, card: CardRef, input: CardUpdate) {
  assertCanAccessCard(actor, card);
  const isAscenzia = card.kind === "ascenzia";

  if (input.slug !== undefined && input.slug !== card.slug) {
    if (isAscenzia) throw new ForbiddenError("Le slug d'une carte Ascenzia n'est pas modifiable.");
    if (actor.role !== "admin")
      throw new ForbiddenError("Seul un administrateur peut changer le slug.");
    const err = validateSlug(input.slug, card.kind);
    if (err) throw new ValidationError({ slug: err });
  }
  if (isAscenzia && input.themeId !== undefined && input.themeId !== "ascenzia")
    throw new ForbiddenError("Le thème d'une carte Ascenzia est verrouillé.");
  if (isAscenzia && input.accentColor)
    throw new ForbiddenError("La couleur d'une carte Ascenzia est verrouillée.");

  const themeId = isAscenzia ? "ascenzia" : (input.themeId ?? card.themeId);
  const accentColor = isAscenzia
    ? null
    : input.accentColor === undefined
      ? card.accentColor
      : (input.accentColor?.toLowerCase() ?? null);

  if (!isAscenzia) {
    const issues = validateThemeSettings({ kind: card.kind, themeId, accentColor });
    if (issues.length) throw new ValidationError({ accentColor: issues.join(" ") });
  }

  return {
    values: {
      slug: input.slug ?? card.slug,
      firstName: input.firstName,
      lastName: input.lastName,
      title: input.title,
      company: isAscenzia ? "Ascenzia" : input.company,
      tagline: input.tagline,
      phone: input.phone,
      email: input.email,
      website: input.website,
      address: input.address ?? null,
      themeId,
      accentColor,
    },
    links: input.links.map((l, position) => ({ ...l, position })),
  };
}

/** Le logo et l'image de fond ne sont modifiables que sur une carte perso (F-32). */
export function assertMediaAllowed(
  card: Pick<CardRef, "kind">,
  kind: "photo" | "logo" | "background",
) {
  if (kind !== "photo" && card.kind === "ascenzia")
    throw new ForbiddenError("Le logo et le fond d'une carte Ascenzia sont ceux de la charte.");
}
