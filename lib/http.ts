import "server-only";
/** Utilitaires des routes API : CSRF par vérification d'origine (N-05), réponses d'erreur homogènes. */
import { NextResponse } from "next/server";
import { ForbiddenError, ValidationError } from "./authz";
import { MissingEnvError } from "./env";
import { MediaError } from "./media";
import { getActor } from "./session";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Refuse toute mutation dont l'en-tête Origin n'est pas celui de l'application. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new HttpError(403, "Origine manquante.");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Origine invalide.");
  }
  if (originHost !== host) throw new HttpError(403, "Origine refusée.");
}

export async function requireApiActor() {
  const actor = await getActor();
  if (!actor) throw new HttpError(401, "Session requise.");
  return actor;
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ValidationError)
    return NextResponse.json({ error: e.message, fields: e.fields }, { status: 422 });
  if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
  if (e instanceof MediaError) return NextResponse.json({ error: e.message }, { status: 422 });
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof MissingEnvError) {
    console.error(e.message);
    return NextResponse.json({ error: "Service non configuré." }, { status: 503 });
  }
  console.error(e);
  return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
}
