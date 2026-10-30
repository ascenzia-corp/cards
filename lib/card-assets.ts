import "server-only";
/** Préparation des fichiers dérivés d'une carte : vCard, pass, QR. */
import { BRAND, resolveTheme } from "./themes";
import { getObject } from "./storage";
import { LOGO_FILES, PHOTO_FILES } from "./media";
import type { CardWithLinks } from "./db/schema";
import { buildVCard } from "./vcard";
import { buildPassJson, generatePkpass, type PassImages } from "./pass";
import { loadPassCertificates, passConfigFromEnv } from "./pass/certificates";
import {
  ascenziaBrandImages,
  iconSetFrom,
  personalLogoImages,
  thumbnailImages,
} from "./pass/images";
import { initialsOf, initialsPng } from "./pass/initials";
import { publicBaseUrl } from "./env";
import type { QrLogo } from "./qr";

export async function photoMaster(card: CardWithLinks): Promise<Buffer | null> {
  return card.photoPath ? getObject(`${card.photoPath}/${PHOTO_FILES.master}`) : null;
}

export async function logoPng(card: CardWithLinks): Promise<Buffer | null> {
  if (card.kind === "ascenzia" || !card.logoPath) return null;
  return getObject(`${card.logoPath}/${LOGO_FILES.master}`);
}

export async function buildCardVCard(card: CardWithLinks): Promise<string> {
  const photo = card.photoPath ? await getObject(`${card.photoPath}/${PHOTO_FILES.vcard}`) : null;
  return buildVCard({
    firstName: card.firstName,
    lastName: card.lastName,
    title: card.title,
    company: card.kind === "ascenzia" ? "Ascenzia" : card.company,
    phone: card.phone,
    email: card.email,
    website: card.website,
    address: card.address,
    links: card.links.filter((l) => l.isVisible),
    photoJpeg: photo,
    cardUrl: `${publicBaseUrl()}/${card.slug}`,
  });
}

export async function buildCardPass(card: CardWithLinks): Promise<Buffer> {
  // Les certificats sont lus en premier : sans eux, on échoue avant tout travail.
  const certificates = loadPassCertificates();
  const config = { ...passConfigFromEnv(), baseUrl: publicBaseUrl() };
  const passJson = buildPassJson({ ...card, links: card.links.filter((l) => l.isVisible) }, config);
  const theme = resolveTheme({
    kind: card.kind,
    themeId: card.themeId,
    accentColor: card.accentColor,
  });
  const images: PassImages = {};

  if (card.kind === "ascenzia") {
    Object.assign(images, await ascenziaBrandImages(passJson.backgroundColor));
  } else {
    const logo = await logoPng(card);
    if (logo) {
      Object.assign(images, await iconSetFrom(logo, passJson.backgroundColor));
      Object.assign(images, await personalLogoImages(logo));
    } else {
      const bg = /rgb\((\d+), (\d+), (\d+)\)/.exec(passJson.backgroundColor);
      const hex = bg
        ? "#" +
          bg
            .slice(1)
            .map((v) => Number(v).toString(16).padStart(2, "0"))
            .join("")
        : BRAND.navy900;
      const initials = await initialsPng(
        initialsOf(card.firstName, card.lastName),
        hex,
        theme.text,
      );
      Object.assign(images, await iconSetFrom(initials, passJson.backgroundColor));
    }
  }
  const photo = await photoMaster(card);
  if (photo) Object.assign(images, await thumbnailImages(photo));

  return generatePkpass(passJson, images, certificates);
}

export async function qrLogoFor(card: CardWithLinks): Promise<QrLogo | undefined> {
  if (card.kind === "ascenzia") return { type: "ascenzia" };
  const logo = await logoPng(card);
  return logo ? { type: "raster", png: logo } : undefined;
}
