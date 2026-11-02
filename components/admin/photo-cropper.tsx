"use client";
/** Recadrage carré de la photo (F-32) : glisser pour cadrer, curseur pour zoomer. */
import { useEffect, useMemo, useRef, useState } from "react";

export interface Crop {
  x: number;
  y: number;
  size: number;
}

const VIEW = 280;

export function PhotoCropper({
  file,
  onCancel,
  onConfirm,
  busy,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (crop: Crop) => void;
  busy: boolean;
}) {
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const scale = natural ? (VIEW / Math.min(natural.w, natural.h)) * zoom : 1;
  const dispW = natural ? natural.w * scale : VIEW;
  const dispH = natural ? natural.h * scale : VIEW;

  function clamp(o: { x: number; y: number }, w = dispW, h = dispH) {
    return { x: Math.min(0, Math.max(VIEW - w, o.x)), y: Math.min(0, Math.max(VIEW - h, o.y)) };
  }

  function onLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const n = { w: img.naturalWidth, h: img.naturalHeight };
    setNatural(n);
    const s = VIEW / Math.min(n.w, n.h);
    setOffset({ x: (VIEW - n.w * s) / 2, y: (VIEW - n.h * s) / 2 });
  }

  function onZoom(next: number) {
    if (!natural) return;
    const oldScale = scale;
    const newScale = (VIEW / Math.min(natural.w, natural.h)) * next;
    // Zoom centré sur le milieu du cadre
    const cx = (VIEW / 2 - offset.x) / oldScale;
    const cy = (VIEW / 2 - offset.y) / oldScale;
    setZoom(next);
    setOffset(
      clamp(
        { x: VIEW / 2 - cx * newScale, y: VIEW / 2 - cy * newScale },
        natural.w * newScale,
        natural.h * newScale,
      ),
    );
  }

  function confirm() {
    if (!natural) return;
    const size = VIEW / scale;
    onConfirm({
      x: -offset.x / scale / natural.w,
      y: -offset.y / scale / natural.h,
      size: size / Math.min(natural.w, natural.h),
    });
  }

  return (
    <div className="panel grid gap-4 p-4">
      <p className="text-sm font-medium">Cadrez la photo</p>
      <div
        className="relative touch-none overflow-hidden rounded-full select-none"
        style={{ width: VIEW, height: VIEW, background: "#000", cursor: "grab" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset(
            clamp({
              x: drag.current.ox + e.clientX - drag.current.px,
              y: drag.current.oy + e.clientY - drag.current.py,
            }),
          );
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Photo à recadrer"
            onLoad={onLoad}
            draggable={false}
            className="absolute top-0 left-0 max-w-none"
            style={{
              width: dispW,
              height: dispH,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        ) : null}
      </div>
      <label className="grid gap-1 text-sm">
        Zoom
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
        />
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          className="btn btn-gold btn-sm"
          onClick={confirm}
          disabled={!natural || busy}
        >
          {busy ? "Envoi…" : "Valider la photo"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          disabled={busy}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
