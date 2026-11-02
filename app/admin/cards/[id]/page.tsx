import { notFound } from "next/navigation";
import { CardEditor } from "@/components/admin/card-editor";
import { loadCardFor, toCardDto } from "@/lib/admin-cards";
import { publicBaseUrl } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { ForbiddenError } from "@/lib/authz";
import { requireActor } from "@/lib/session";

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  let card;
  try {
    card = await loadCardFor(actor, id);
  } catch (e) {
    // Une carte d'autrui est présentée comme inexistante : aucune fuite d'information.
    if (e instanceof HttpError || e instanceof ForbiddenError) notFound();
    throw e;
  }
  return (
    <CardEditor
      initial={toCardDto(card)}
      isAdmin={actor.role === "admin"}
      baseUrl={publicBaseUrl()}
      walletBadgeSrc={process.env.NEXT_PUBLIC_WALLET_BADGE_SRC || null}
    />
  );
}
