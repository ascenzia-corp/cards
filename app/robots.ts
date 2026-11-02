import type { MetadataRoute } from "next";

/**
 * N-13 : les cartes sont indexables, /admin et /api ne le sont pas.
 * Exception : l'image Open Graph et les photos, que les robots d'aperçu (LinkedIn, iMessage…)
 * doivent pouvoir lire pour afficher la vignette (F-07).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/cards/*/og", "/api/cards/*/media/"],
      disallow: ["/admin", "/api/", "/login"],
    },
  };
}
