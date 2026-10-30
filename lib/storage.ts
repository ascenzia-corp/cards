import "server-only";
/**
 * Stockage des médias dans un bucket Supabase privé (section 8).
 * Les fichiers ne sont jamais exposés par URL signée : ils sont relayés par
 * /api/cards/[slug]/media/[file] avec un cache CDN long (URL versionnées).
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { optionalEnv, requireEnv } from "./env";

/**
 * Pilote disque pour le développement local uniquement (LOCAL_STORAGE_DIR) : permet de tester
 * les médias sans projet Supabase. Refusé sur Vercel.
 */
function localDir(): string | null {
  const dir = optionalEnv("LOCAL_STORAGE_DIR");
  if (!dir) return null;
  if (process.env.VERCEL)
    throw new Error("LOCAL_STORAGE_DIR est interdit sur Vercel : utilisez Supabase Storage.");
  return path.resolve(dir);
}

function localPath(dir: string, objectPath: string): string {
  const full = path.resolve(dir, objectPath);
  if (!full.startsWith(dir + path.sep)) throw new Error("Chemin de stockage invalide.");
  return full;
}

let client: SupabaseClient | undefined;

function storage() {
  client ??= createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client.storage.from(bucketName());
}

export function bucketName(): string {
  return optionalEnv("SUPABASE_STORAGE_BUCKET") ?? "cards-media";
}

export async function putObject(path: string, body: Buffer, contentType: string): Promise<void> {
  const dir = localDir();
  if (dir) {
    const file = localPath(dir, path);
    await mkdir(/*turbopackIgnore: true*/ file.slice(0, file.lastIndexOf("/")), {
      recursive: true,
    });
    await writeFile(/*turbopackIgnore: true*/ file, body);
    return;
  }
  const { error } = await storage().upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Échec d'envoi vers le stockage (${path}) : ${error.message}`);
}

export async function getObject(path: string): Promise<Buffer | null> {
  const dir = localDir();
  if (dir) return readFile(/*turbopackIgnore: true*/ localPath(dir, path)).catch(() => null);
  const { data, error } = await storage().download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const dir = localDir();
  if (dir) {
    await Promise.all(
      paths.map((p) => rm(/*turbopackIgnore: true*/ localPath(dir, p), { force: true })),
    );
    return;
  }
  await storage().remove(paths);
}
