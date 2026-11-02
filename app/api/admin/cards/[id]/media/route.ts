import { NextResponse } from "next/server";
import { removeMedia, toCardDto, uploadMedia } from "@/lib/admin-cards";
import { ValidationError } from "@/lib/authz";
import { assertSameOrigin, errorResponse, requireApiActor } from "@/lib/http";
import { MAX_UPLOAD_BYTES, type MediaKind, type SquareCrop } from "@/lib/media";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const KINDS: MediaKind[] = ["photo", "logo", "background"];

function parseKind(v: unknown): MediaKind {
  if (typeof v === "string" && (KINDS as string[]).includes(v)) return v as MediaKind;
  throw new ValidationError({ kind: "Type de média inconnu." });
}

function parseCrop(raw: FormDataEntryValue | null): SquareCrop | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const c = JSON.parse(raw) as SquareCrop;
    const ok = [c.x, c.y, c.size].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1,
    );
    return ok && c.size > 0 ? c : undefined;
  } catch {
    return undefined;
  }
}

/** Upload photo, logo ou fond (F-32) : type réel vérifié, 5 Mo max, variantes générées. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    assertSameOrigin(req);
    const actor = await requireApiActor();
    const { id } = await params;
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > MAX_UPLOAD_BYTES + 64 * 1024)
      throw new ValidationError({ file: "Fichier trop lourd (5 Mo maximum)." });
    const form = await req.formData();
    const kind = parseKind(form.get("kind"));
    const file = form.get("file");
    if (!(file instanceof Blob)) throw new ValidationError({ file: "Fichier manquant." });
    if (file.size > MAX_UPLOAD_BYTES)
      throw new ValidationError({ file: "Fichier trop lourd (5 Mo maximum)." });
    const buffer = Buffer.from(await file.arrayBuffer());
    const card = await uploadMedia(actor, id, kind, buffer, parseCrop(form.get("crop")));
    return NextResponse.json(toCardDto(card));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    assertSameOrigin(req);
    const actor = await requireApiActor();
    const { id } = await params;
    const kind = parseKind(new URL(req.url).searchParams.get("kind"));
    return NextResponse.json(toCardDto(await removeMedia(actor, id, kind)));
  } catch (e) {
    return errorResponse(e);
  }
}
