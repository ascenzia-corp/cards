import { NextResponse } from "next/server";
import { cardUpdateSchema, flattenIssues } from "@/lib/card-schema";
import { loadCardFor, toCardDto, updateCard } from "@/lib/admin-cards";
import { ValidationError } from "@/lib/authz";
import { assertSameOrigin, errorResponse, requireApiActor } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Lecture d'une carte et de ses liens (F-31). Un membre est limité à ses cartes. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const actor = await requireApiActor();
    const { id } = await params;
    return NextResponse.json(toCardDto(await loadCardFor(actor, id)));
  } catch (e) {
    return errorResponse(e);
  }
}

/** Édition (F-31, F-33). Thème et slug d'une carte Ascenzia refusés en écriture (R-09). */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    assertSameOrigin(req);
    const actor = await requireApiActor();
    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError({ _: "Corps JSON invalide." });
    }
    const parsed = cardUpdateSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(flattenIssues(parsed.error));
    return NextResponse.json(toCardDto(await updateCard(actor, id, parsed.data)));
  } catch (e) {
    return errorResponse(e);
  }
}
