/** Chargement des certificats Apple depuis l'environnement (PEM encodés en base64). */
import forge from "node-forge";
import { optionalEnv, requireEnv } from "../env";

export interface PassCertificates {
  wwdr: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
}

function decodePem(name: string): string {
  const pem = Buffer.from(requireEnv(name), "base64").toString("utf8");
  if (!pem.includes("-----BEGIN"))
    throw new Error(`${name} ne contient pas un PEM encodé en base64.`);
  return pem;
}

export function loadPassCertificates(): PassCertificates {
  return {
    wwdr: decodePem("APPLE_WWDR_B64"),
    signerCert: decodePem("APPLE_PASS_CERT_B64"),
    signerKey: decodePem("APPLE_PASS_KEY_B64"),
    signerKeyPassphrase: optionalEnv("APPLE_PASS_KEY_PASSPHRASE"),
  };
}

export function passConfigFromEnv() {
  return {
    teamIdentifier: requireEnv("APPLE_TEAM_ID"),
    passTypeIdentifier: requireEnv("APPLE_PASS_TYPE_ID"),
  };
}

export type CertificateStatus =
  | { state: "missing"; missing: string }
  | { state: "invalid"; error: string }
  | { state: "ok"; notAfter: Date; daysLeft: number; subject: string };

/** État du certificat de pass pour l'admin : alerte 30 jours avant expiration (section 6). */
export function passCertificateStatus(now = new Date()): CertificateStatus {
  for (const name of [
    "APPLE_TEAM_ID",
    "APPLE_PASS_TYPE_ID",
    "APPLE_PASS_CERT_B64",
    "APPLE_PASS_KEY_B64",
    "APPLE_WWDR_B64",
  ]) {
    if (!optionalEnv(name)) return { state: "missing", missing: name };
  }
  try {
    const cert = forge.pki.certificateFromPem(decodePem("APPLE_PASS_CERT_B64"));
    const notAfter = cert.validity.notAfter;
    const daysLeft = Math.floor((notAfter.getTime() - now.getTime()) / 86_400_000);
    const cn = cert.subject.getField("CN")?.value ?? "";
    return { state: "ok", notAfter, daysLeft, subject: String(cn) };
  } catch (e) {
    return { state: "invalid", error: e instanceof Error ? e.message : String(e) };
  }
}
