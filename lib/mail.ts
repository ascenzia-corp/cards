import "server-only";
/** E-mail transactionnel via Resend (section 8). */
import { Resend } from "resend";
import { requireEnv } from "./env";

let client: Resend | undefined;

export async function sendMail(msg: { to: string; subject: string; html: string; text: string }) {
  client ??= new Resend(requireEnv("RESEND_API_KEY"));
  const { error } = await client.emails.send({ from: requireEnv("MAIL_FROM"), ...msg });
  if (error) throw new Error(`Échec d'envoi de l'e-mail : ${error.message}`);
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Gabarit sobre, aux couleurs de la charte (fond clair, bouton gold, texte navy). */
export function actionEmail(p: { intro: string; button: string; url: string; footer: string }) {
  const url = escapeHtml(p.url);
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#fafafb;font-family:'Open Sans',-apple-system,Segoe UI,sans-serif;color:#1a202c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#4c5464;font-weight:600">Ascenzia Cards</td></tr>
<tr><td style="padding:16px 0 24px;font-size:16px;line-height:1.5">${escapeHtml(p.intro)}</td></tr>
<tr><td><a href="${url}" style="display:inline-block;background:#ddac63;color:#1a202c;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(p.button)}</a></td></tr>
<tr><td style="padding-top:24px;font-size:13px;line-height:1.5;color:#4c5464">${escapeHtml(p.footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${p.intro}\n\n${p.button} : ${p.url}\n\n${p.footer}\n`;
  return { html, text };
}
