import { lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { requireEnv } from "@/lib/env";
import { errorResponse } from "@/lib/http";

/** Purge quotidienne des événements au-delà de 90 jours (N-09). Appelée par Vercel Cron avec CRON_SECRET. */
export async function GET(req: Request) {
  try {
    if (req.headers.get("authorization") !== `Bearer ${requireEnv("CRON_SECRET")}`)
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const cutoff = new Date(Date.now() - 90 * 86_400_000);
    const deleted = await getDb()
      .delete(events)
      .where(lt(events.createdAt, cutoff))
      .returning({ id: events.id });
    return NextResponse.json({ deletedEvents: deleted.length });
  } catch (e) {
    return errorResponse(e);
  }
}
