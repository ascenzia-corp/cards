"use client";
/**
 * Compteur de vues sans cookie (F-09, N-09) : envoie le canal (?src=) puis le retire de l'URL affichée.
 * Non bloquant (sendBeacon), aucune donnée stockée côté navigateur.
 */
import { useEffect } from "react";

const SOURCES = new Set(["qr", "wallet", "nfc", "link"]);

export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `__viewSent_${slug}`;
    const w = window as unknown as Record<string, boolean>;
    if (w[key]) return;
    w[key] = true;
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("src");
    const src = raw && SOURCES.has(raw) ? raw : "link";
    // text/plain : type « CORS-safelisted », accepté par sendBeacon dans tous les navigateurs
    const body = new Blob([JSON.stringify({ src })], { type: "text/plain;charset=UTF-8" });
    const endpoint = `/api/cards/${encodeURIComponent(slug)}/view`;
    if (!navigator.sendBeacon?.(endpoint, body)) {
      void fetch(endpoint, { method: "POST", body, keepalive: true });
    }
    if (raw !== null) {
      url.searchParams.delete("src");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [slug]);
  return null;
}
