import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { markSvg } from "@/lib/brand-mark";
import { getPublicCard } from "@/lib/cards";
import { PHOTO_FILES } from "@/lib/media";
import { getObject } from "@/lib/storage";
import { toViewModel } from "@/lib/view-model";

/** F-07 : image Open Graph 1200×630 rendue aux couleurs du thème de la carte. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getPublicCard(slug);
  if (!card) return new NextResponse(null, { status: 404 });
  const vm = toViewModel(card, { backgroundUrl: null });
  const { theme } = vm;
  const photo = card.photoPath ? await getObject(`${card.photoPath}/${PHOTO_FILES.og}`) : null;
  const photoSrc = photo ? `data:image/jpeg;base64,${photo.toString("base64")}` : null;
  const mark = `data:image/svg+xml;base64,${Buffer.from(markSvg("#ffffff")).toString("base64")}`;
  // Satori ne gère pas les fonds composés (voile + image) : on garde le fond de repli du thème photo.
  const background = theme.id === "photo" ? "#14171d" : theme.cardBackground;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background,
        color: theme.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        {theme.brandLogo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={mark} width={72} height={56} />
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "0.04em" }}>ASCENZIA</span>
          </>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={photoSrc} width={240} height={240} style={{ borderRadius: 9999 }} />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div
            style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" }}
          >
            {vm.name}
          </div>
          {vm.title ? (
            <div style={{ fontSize: 38, marginTop: 18, color: theme.highlight }}>{vm.title}</div>
          ) : null}
          {vm.company ? (
            <div
              style={{
                fontSize: 28,
                marginTop: 14,
                color: theme.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {vm.company}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 26, color: theme.muted }}>
        {`${(process.env.PUBLIC_BASE_URL ?? "").replace(/^https?:\/\//, "")}/${card.slug}`}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    },
  );
}
