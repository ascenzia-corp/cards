import { NextResponse } from "next/server";
import { getPublicCard } from "@/lib/cards";
import { BACKGROUND_FILES, LOGO_FILES, PHOTO_FILES, mediaVersion } from "@/lib/media";
import { getObject } from "@/lib/storage";
import type { Card } from "@/lib/db/schema";

/** Fichiers publics exposés, chacun lié à un dossier de la carte. */
const FILES: Record<string, { folder: (c: Card) => string | null; name: string; type: string }> = {
  "photo.webp": { folder: (c) => c.photoPath, name: PHOTO_FILES.page, type: "image/webp" },
  "photo.jpg": { folder: (c) => c.photoPath, name: PHOTO_FILES.og, type: "image/jpeg" },
  "logo.png": {
    folder: (c) => (c.kind === "personal" ? c.logoPath : null),
    name: LOGO_FILES.master,
    type: "image/png",
  },
  "background.webp": {
    folder: (c) => (c.kind === "personal" ? c.backgroundPath : null),
    name: BACKGROUND_FILES.page,
    type: "image/webp",
  },
};

/** Relais des médias du bucket privé, avec cache CDN long : l'URL porte la version (?v=). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; file: string }> },
) {
  const { slug, file } = await params;
  const spec = FILES[file];
  if (!spec) return new NextResponse(null, { status: 404 });
  const card = await getPublicCard(slug);
  const folder = card ? spec.folder(card) : null;
  if (!folder) return new NextResponse(null, { status: 404 });
  const body = await getObject(`${folder}/${spec.name}`);
  if (!body) return new NextResponse(null, { status: 404 });
  const current = new URL(req.url).searchParams.get("v") === mediaVersion(folder);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": spec.type,
      "Cache-Control": current ? "public, max-age=31536000, immutable" : "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
