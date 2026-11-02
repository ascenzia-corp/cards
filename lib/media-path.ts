/** Chemins versionnés des médias (sans dépendance serveur : utilisable côté client). */
export type MediaKind = "photo" | "logo" | "background";

/** Dossier versionné d'un média : cards/<id>/<kind>-<horodatage> */
export function mediaFolder(cardId: string, kind: MediaKind, now = Date.now()): string {
  return `cards/${cardId}/${kind}-${now.toString(36)}`;
}

/** Version courte (pour l'URL publique) extraite du dossier. */
export function mediaVersion(folder: string | null | undefined): string | null {
  if (!folder) return null;
  return folder.split("-").pop() ?? null;
}
