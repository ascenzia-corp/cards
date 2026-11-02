import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "node:path";

const isDev = process.env.NODE_ENV === "development";

/**
 * CSP des pages publiques (N-05). Les pages publiques sont statiques (N-02), donc sans nonce :
 * les scripts inline de bootstrap de Next exigent 'unsafe-inline' ici. Les pages /admin
 * reçoivent une CSP stricte à nonce depuis proxy.ts.
 */
const publicCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isDev
    ? []
    : [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ]),
];

/**
 * Badge officiel « Ajouter à Apple Wallet » (section 10) : Apple le distribue sous licence,
 * il doit être déposé à la main dans public/wallet/. Tant qu'il est absent, un bouton noir sobre le remplace.
 */
const WALLET_BADGE = "/wallet/add-to-apple-wallet-fr.svg";
const walletBadgeSrc = existsSync(path.join(process.cwd(), "public", WALLET_BADGE))
  ? WALLET_BADGE
  : "";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_WALLET_BADGE_SRC: walletBadgeSrc },
  reactStrictMode: true,
  poweredByHeader: false,
  // N-01 : CSS inliné dans le HTML (≈ 8 Ko), aucune feuille bloquante avant le premier rendu
  experimental: { inlineCss: true },
  serverExternalPackages: ["passkit-generator", "sharp", "postgres"],
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    // F-01 : la racine du domaine renvoie vers ascenzia.ai
    return [{ source: "/", destination: "https://ascenzia.ai", statusCode: 302 }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // CSP sans nonce pour tout ce qui n'est pas l'admin (proxy.ts gère /admin et /api/admin)
        source: "/((?!admin|api/admin|login).*)",
        headers: [{ key: "Content-Security-Policy", value: publicCsp }],
      },
    ];
  },
};

export default nextConfig;
