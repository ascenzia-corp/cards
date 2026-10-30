/**
 * Page publique d'une carte (F-01 à F-07, N-02) : rendue côté serveur puis mise en cache,
 * revalidée à chaque modification de la carte. Aucun appel API bloquant au chargement.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { CardFace, LinkList, PrimaryActions } from "@/components/card-view";
import { ViewBeacon } from "@/components/view-beacon";
import { WalletButton } from "@/components/wallet-button";
import { getPublicCard } from "@/lib/cards";
import { publicBaseUrl } from "@/lib/env";
import { t } from "@/lib/i18n";
import { SLUG_RE } from "@/lib/slug";
import { toViewModel } from "@/lib/view-model";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!SLUG_RE.test(slug)) return null;
  return getPublicCard(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const card = await load(slug);
  if (!card) return { title: t.notFound.title, robots: { index: false } };
  const vm = toViewModel(card);
  const title = [vm.name, vm.title].filter(Boolean).join(" · ");
  const description =
    [vm.title, vm.company, vm.tagline].filter(Boolean).join(" · ") || t.public.cardOf(vm.name);
  const url = `${publicBaseUrl()}/${card.slug}`;
  const image = {
    url: `/api/cards/${card.slug}/og?v=${card.updatedAt.getTime().toString(36)}`,
    width: 1200,
    height: 630,
    alt: title,
  };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      url,
      title,
      description,
      images: [image],
      firstName: card.firstName,
      lastName: card.lastName,
      locale: "fr_FR",
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function CardPage({ params }: Props) {
  const { slug } = await params;
  const card = await load(slug);
  if (!card) notFound();
  const vm = toViewModel(card);
  const url = `${publicBaseUrl()}/${card.slug}`;
  // La photo est l'élément LCP : préchargée en priorité haute (N-01)
  if (vm.photoUrl) preload(vm.photoUrl, { as: "image", fetchPriority: "high" });

  // Données structurées Person (N-13)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: vm.name,
    givenName: card.firstName,
    familyName: card.lastName,
    jobTitle: vm.title ?? undefined,
    worksFor: vm.company ? { "@type": "Organization", name: vm.company } : undefined,
    email: vm.email ? `mailto:${vm.email}` : undefined,
    telephone: vm.phone ?? undefined,
    url,
    image: vm.photoUrl ? `${publicBaseUrl()}${vm.photoUrl}` : undefined,
    sameAs: [vm.website, ...vm.links.map((l) => l.url)].filter(Boolean),
  };

  return (
    <main className="mx-auto w-full max-w-[440px] px-4 pt-[max(16px,env(safe-area-inset-top))] pb-10">
      <CardFace card={vm} />
      <PrimaryActions
        card={vm}
        walletSlot={
          <WalletButton
            slug={card.slug}
            badgeSrc={process.env.NEXT_PUBLIC_WALLET_BADGE_SRC || null}
          />
        }
      />
      <LinkList card={vm} />
      <footer
        className="mt-8 flex items-center justify-between text-sm"
        style={{ color: "var(--fg-muted)" }}
      >
        <span>{vm.name}</span>
        <Link href="/mentions" prefetch={false} className="underline underline-offset-2">
          {t.public.legal}
        </Link>
      </footer>
      <ViewBeacon slug={card.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </main>
  );
}
