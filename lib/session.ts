import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { Actor } from "./authz";

/** Utilisateur connecté et actif, ou null. */
export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.isActive) return null;
  return { id: u.id, email: u.email, role: u.role };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}
