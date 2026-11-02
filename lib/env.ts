/**
 * Accès centralisé aux variables d'environnement (N-04).
 * Un secret manquant lève une erreur explicite : aucune valeur factice n'est jamais utilisée.
 */
export class MissingEnvError extends Error {
  constructor(public readonly variable: string) {
    super(`Variable d'environnement manquante : ${variable}`);
    this.name = "MissingEnvError";
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") throw new MissingEnvError(name);
  return value.trim();
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function list(name: string): string[] {
  return (optionalEnv(name) ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** URL publique sans barre finale, ex. https://cards.ascenzia.ai */
export function publicBaseUrl(): string {
  return requireEnv("PUBLIC_BASE_URL").replace(/\/+$/, "");
}

/** Domaine affiché (sans schéma), ex. cards.ascenzia.ai */
export function publicHost(): string {
  return new URL(publicBaseUrl()).host;
}

export function adminEmails(): string[] {
  return list("ADMIN_EMAILS");
}

export function allowedEmailDomains(): string[] {
  return list("ALLOWED_EMAIL_DOMAINS");
}
