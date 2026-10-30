/**
 * Génération d'une vCard 3.0 (F-04), sans dépendance externe.
 * RFC 2426 : lignes CRLF, pliage à 75 octets, échappement de \ , ; et des retours ligne.
 */

export interface VCardAddress {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface VCardInput {
  firstName: string;
  lastName: string;
  title?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: VCardAddress | null;
  links?: { label: string; url: string }[];
  /** Photo JPEG brute, encodée en base64 dans la carte */
  photoJpeg?: Buffer | null;
  /** URL publique de la carte, placée en note */
  cardUrl: string;
}

const CRLF = "\r\n";

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\;");
}

/**
 * Plie une ligne à 75 octets UTF-8 maximum, sans couper un caractère multi-octets.
 * Les lignes de continuation commencent par une espace (comptée dans les 75 octets).
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (currentBytes + bytes > limit) {
      out.push(current);
      current = " " + char;
      currentBytes = 1 + bytes;
      limit = 75;
    } else {
      current += char;
      currentBytes += bytes;
    }
  }
  if (current) out.push(current);
  return out.join(CRLF);
}

function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function buildVCard(input: VCardInput): string {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

  lines.push(`N:${escapeText(lastName)};${escapeText(firstName)};;;`);
  lines.push(`FN:${escapeText([firstName, lastName].filter(Boolean).join(" "))}`);

  const company = clean(input.company);
  if (company) lines.push(`ORG:${escapeText(company)}`);
  const title = clean(input.title);
  if (title) lines.push(`TITLE:${escapeText(title)}`);
  const phone = clean(input.phone);
  if (phone) lines.push(`TEL;TYPE=CELL,VOICE:${escapeText(phone)}`);
  const email = clean(input.email);
  if (email) lines.push(`EMAIL;TYPE=INTERNET,PREF:${escapeText(email)}`);
  const website = clean(input.website);
  if (website) lines.push(`URL:${escapeText(website)}`);

  // Liens supplémentaires, libellés pour Contacts iOS (convention itemN.X-ABLabel)
  let item = 1;
  for (const link of input.links ?? []) {
    const url = clean(link.url);
    if (!url) continue;
    lines.push(`item${item}.URL:${escapeText(url)}`);
    lines.push(`item${item}.X-ABLabel:${escapeText(link.label.trim() || "Lien")}`);
    item++;
  }

  const a = input.address;
  if (a && (clean(a.street) || clean(a.city) || clean(a.postalCode) || clean(a.country))) {
    const parts = ["", "", a.street, a.city, "", a.postalCode, a.country].map((p) =>
      escapeText(clean(p) ?? ""),
    );
    lines.push(`ADR;TYPE=WORK:${parts.join(";")}`);
  }

  if (input.photoJpeg && input.photoJpeg.length > 0) {
    lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${input.photoJpeg.toString("base64")}`);
  }

  lines.push(`NOTE:${escapeText(`Carte de visite : ${input.cardUrl}`)}`);
  lines.push("END:VCARD");

  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Nom de fichier ASCII sûr pour Content-Disposition */
export function vcardFilename(slug: string): string {
  return `${slug.replace(/[^a-z0-9.-]/g, "")}.vcf`;
}
