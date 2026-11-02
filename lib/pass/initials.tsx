/**
 * Icône de repli d'une carte perso sans logo : initiales générées.
 * Rendu via next/og (polices embarquées), fiable en fonction serveur sans police système.
 */
import { ImageResponse } from "next/og";

export async function initialsPng(initials: string, background: string, color: string, px = 300) {
  const res = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
        color,
        fontSize: px * 0.42,
        fontWeight: 700,
        letterSpacing: "-0.02em",
      }}
    >
      {initials}
    </div>,
    { width: px, height: px },
  );
  return Buffer.from(await res.arrayBuffer());
}

export function initialsOf(firstName: string, lastName: string): string {
  return ((firstName.trim()[0] ?? "") + (lastName.trim()[0] ?? "")).toUpperCase() || "?";
}
