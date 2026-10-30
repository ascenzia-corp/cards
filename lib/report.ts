import "server-only";
/**
 * Journalisation des erreurs serveur (N-14). Les journaux Vercel conservent la trace ;
 * une alerte e-mail aux admins part si Resend est configuré.
 */
import { MissingEnvError, adminEmails, optionalEnv } from "./env";
import { sendMail } from "./mail";

export async function reportError(
  subject: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
      : String(error);
  console.error(`[${subject}]`, context, detail);
  // Une configuration manquante n'est pas un incident à notifier par e-mail à chaque appel.
  if (error instanceof MissingEnvError) return;
  const to = adminEmails()[0];
  if (!to || !optionalEnv("RESEND_API_KEY") || !optionalEnv("MAIL_FROM")) return;
  const text = `${subject}\n\nContexte : ${JSON.stringify(context)}\n\n${detail}`;
  await sendMail({
    to,
    subject: `[Ascenzia Cards] ${subject}`,
    text,
    html: `<pre>${text.replace(/</g, "&lt;")}</pre>`,
  }).catch((e) => console.error("Alerte e-mail non envoyée", e));
}
