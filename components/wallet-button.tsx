"use client";
/**
 * Bouton « Ajouter à Apple Wallet » (F-11) : visible uniquement sur iOS, iPadOS ou Safari macOS.
 * Dans un navigateur intégré (LinkedIn, Instagram, Messenger…), une aide « Ouvrir dans Safari » s'affiche.
 */
import { useSyncExternalStore } from "react";
import { Wallet } from "lucide-react";
import { t } from "@/lib/i18n";

type Platform = { wallet: boolean; inApp: boolean };
const NONE: Platform = { wallet: false, inApp: false };
let cached: Platform | null = null;

function detect(): Platform {
  if (cached) return cached;
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const macSafari =
    /Macintosh/.test(ua) &&
    /Safari\//.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(ua);
  const inApp =
    /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Messenger|Line\/|MicroMessenger|Twitter|Snapchat|TikTok/i.test(
      ua,
    );
  cached = { wallet: iOS || macSafari, inApp: iOS && inApp };
  return cached;
}

const subscribe = () => () => {};

export function WalletButton({ slug, badgeSrc }: { slug: string; badgeSrc?: string | null }) {
  const platform = useSyncExternalStore(subscribe, detect, () => NONE);
  if (!platform.wallet) return null;
  return (
    <div className="grid gap-2">
      <a
        href={`/api/cards/${slug}/pass`}
        className="wallet-button"
        aria-label={t.public.addToWallet}
      >
        {badgeSrc ? (
          // Actif officiel Apple, non déformé (section 10)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={badgeSrc} alt={t.public.addToWallet} height={48} className="h-12 w-auto" />
        ) : (
          <span className="wallet-fallback">
            <Wallet aria-hidden="true" size={20} strokeWidth={1.6} />
            {t.public.addToWallet}
          </span>
        )}
      </a>
      {platform.inApp ? <p className="hint text-sm">{t.public.openInSafari}</p> : null}
    </div>
  );
}
