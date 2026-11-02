/**
 * Schémas Zod partagés entre formulaire, routes API et base (N-07).
 */
import { z } from "zod";
import { normalizePhone } from "./phone";

export const LINK_KINDS = ["linkedin", "x", "instagram", "calendar", "website", "custom"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export const MAX_LINKS = 10;

export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
  calendar: "Prendre rendez-vous",
  website: "Site web",
  custom: "Lien",
};

function optionalText(max: number) {
  return z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t ? t : null;
    })
    .pipe(z.string().max(max, `${max} caractères maximum`).nullable());
}

/** Accepte « ascenzia.ai » et ajoute https:// ; seuls http et https sont admis. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const urlField = z
  .string()
  .max(500)
  .transform((v, ctx) => {
    const url = normalizeUrl(v);
    if (!url) {
      ctx.addIssue({ code: "custom", message: "URL invalide (http ou https)" });
      return z.NEVER;
    }
    return url;
  });

const optionalUrl = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (!v?.trim()) return null;
    const url = normalizeUrl(v);
    if (!url) {
      ctx.addIssue({ code: "custom", message: "URL invalide (http ou https)" });
      return z.NEVER;
    }
    return url;
  });

const optionalPhone = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (!v?.trim()) return null;
    const phone = normalizePhone(v);
    if (!phone) {
      ctx.addIssue({
        code: "custom",
        message: "Numéro invalide (format international, ex. +33 6 12 34 56 78)",
      });
      return z.NEVER;
    }
    return phone;
  });

const optionalEmail = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => v?.trim().toLowerCase() || null)
  .pipe(z.email("Adresse e-mail invalide").nullable());

export const linkInputSchema = z.object({
  kind: z.enum(LINK_KINDS),
  label: z.string().trim().min(1, "Libellé requis").max(40),
  url: urlField,
  isVisible: z.boolean().default(true),
});

export const addressSchema = z
  .object({
    street: optionalText(120),
    postalCode: optionalText(20),
    city: optionalText(80),
    country: optionalText(60),
  })
  .transform((a) => {
    const entries = Object.entries(a).filter(([, v]) => v !== null) as [string, string][];
    return entries.length ? (Object.fromEntries(entries) as Record<string, string>) : null;
  });

export const cardUpdateSchema = z
  .object({
    slug: z.string().trim().toLowerCase().optional(),
    firstName: z.string().trim().min(1, "Prénom requis").max(60),
    lastName: z.string().trim().min(1, "Nom requis").max(60),
    title: optionalText(80),
    company: optionalText(80),
    tagline: optionalText(120),
    phone: optionalPhone,
    email: optionalEmail,
    website: optionalUrl,
    address: z.union([addressSchema, z.null()]).optional(),
    themeId: z.string().optional(),
    accentColor: z
      .union([z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur au format #rrggbb"), z.null()])
      .optional(),
    links: z.array(linkInputSchema).max(MAX_LINKS, `${MAX_LINKS} liens maximum`).default([]),
  })
  .strict();

export type CardUpdateInput = z.input<typeof cardUpdateSchema>;
export type CardUpdate = z.output<typeof cardUpdateSchema>;

/** Erreurs Zod aplaties pour l'interface : { "links.2.url": "URL invalide" } */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
