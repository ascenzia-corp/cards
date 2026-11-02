/** Hachage salé et tronqué de l'IP (N-09) : SHA-256, 16 caractères, jamais l'IP en clair. */
import { createHash } from "node:crypto";
import { requireEnv } from "./env";

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "0.0.0.0";
}

export function hashIp(ip: string, salt = requireEnv("IP_HASH_SALT")): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

export const EVENT_SOURCES = ["qr", "wallet", "nfc", "link", "unknown"] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export function parseSource(value: string | null | undefined): EventSource {
  return (EVENT_SOURCES as readonly string[]).includes(value ?? "")
    ? (value as EventSource)
    : "unknown";
}
