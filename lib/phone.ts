/** Téléphone stocké au format E.164 (section 9), saisi librement dans l'admin. */

export const E164_RE = /^\+[1-9]\d{6,14}$/;

/** Normalise « 06 12 34 56 78 » ou « +33 (0)6 12… » en +33612345678. Retourne null si invalide. */
export function normalizePhone(input: string): string | null {
  let v = input
    .trim()
    .replace(/\(0\)/g, "")
    .replace(/[\s.\-()]/g, "");
  if (v.startsWith("00")) v = "+" + v.slice(2);
  if (/^0[1-9]\d{8}$/.test(v)) v = "+33" + v.slice(1);
  return E164_RE.test(v) ? v : null;
}

/** Affichage lisible : +33 6 12 34 56 78 pour la France, groupes de 3 sinon. */
export function formatPhone(e164: string): string {
  const fr = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  if (fr) return `+33 ${fr.slice(1).join(" ")}`;
  const m = /^\+(\d{1,3})(\d+)$/.exec(e164);
  if (!m) return e164;
  return `+${m[1]} ${m[2]!.replace(/(\d{3})(?=\d)/g, "$1 ")}`;
}
