/**
 * Assemblage et signature du .pkpass via passkit-generator :
 * manifest.json (SHA-1 de chaque fichier), signature PKCS#7 détachée, archive ZIP.
 */
import { PKPass } from "passkit-generator";
import type { PassCertificates } from "./certificates";
import type { PassJson } from "./pass-json";

/** Fichiers image du paquet, ex. { "icon.png": Buffer, "icon@2x.png": Buffer, ... } */
export type PassImages = Record<string, Buffer>;

export const REQUIRED_PASS_IMAGES = ["icon.png", "icon@2x.png", "icon@3x.png"] as const;

export function generatePkpass(
  passJson: PassJson,
  images: PassImages,
  certificates: PassCertificates,
): Buffer {
  for (const name of REQUIRED_PASS_IMAGES) {
    if (!images[name]) throw new Error(`Image obligatoire manquante dans le pass : ${name}`);
  }
  const pass = new PKPass(
    { ...images, "pass.json": Buffer.from(JSON.stringify(passJson)) },
    {
      wwdr: certificates.wwdr,
      signerCert: certificates.signerCert,
      signerKey: certificates.signerKey,
      signerKeyPassphrase: certificates.signerKeyPassphrase,
    },
  );
  return pass.getAsBuffer();
}

export const PKPASS_MIME = "application/vnd.apple.pkpass";
