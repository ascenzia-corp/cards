"use client";
/**
 * Éditeur de carte (F-31 à F-33) : saisie, aperçu mobile en direct, enregistrement explicite.
 * Les verrous de la carte Ascenzia sont reflétés dans l'interface et revérifiés par le serveur.
 */
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, TriangleAlert, Upload } from "lucide-react";
import type { CardDto } from "@/lib/admin-cards";
import { LINK_KINDS, LINK_KIND_LABELS, MAX_LINKS, type LinkKind } from "@/lib/card-schema";
import { normalizePhone } from "@/lib/phone";
import {
  DEFAULT_ACCENT,
  PERSONAL_THEME_IDS,
  THEME_LABELS,
  validateThemeSettings,
} from "@/lib/themes";
import { toViewModel } from "@/lib/view-model";
import { CardFace, LinkList, PrimaryActions } from "../card-view";
import { PhotoCropper, type Crop } from "./photo-cropper";
import { SharePanel } from "./share-panel";

type LinkForm = { kind: LinkKind; label: string; url: string; isVisible: boolean };
type Form = {
  slug: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  themeId: string;
  accentColor: string;
  links: LinkForm[];
};

function toForm(c: CardDto): Form {
  return {
    slug: c.slug,
    firstName: c.firstName,
    lastName: c.lastName,
    title: c.title ?? "",
    company: c.kind === "ascenzia" ? "Ascenzia" : (c.company ?? ""),
    tagline: c.tagline ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    website: c.website ?? "",
    street: c.address?.street ?? "",
    postalCode: c.address?.postalCode ?? "",
    city: c.address?.city ?? "",
    country: c.address?.country ?? "",
    themeId: c.themeId,
    accentColor: c.accentColor ?? DEFAULT_ACCENT,
    links: c.links.map((l) => ({
      kind: l.kind,
      label: l.label,
      url: l.url,
      isVisible: l.isVisible,
    })),
  };
}

function toPayload(f: Form, card: CardDto, isAdmin: boolean) {
  const isAscenzia = card.kind === "ascenzia";
  return {
    ...(isAdmin && !isAscenzia ? { slug: f.slug } : {}),
    firstName: f.firstName,
    lastName: f.lastName,
    title: f.title,
    company: isAscenzia ? null : f.company,
    tagline: f.tagline,
    phone: f.phone,
    email: f.email,
    website: f.website,
    address: { street: f.street, postalCode: f.postalCode, city: f.city, country: f.country },
    ...(isAscenzia ? {} : { themeId: f.themeId, accentColor: f.accentColor }),
    links: f.links,
  };
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  disabled,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = `f-${name}`;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className="input disabled:opacity-60"
        {...rest}
      />
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs" style={{ color: "var(--fg-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

async function api<T>(
  url: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> }> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
      return { ok: false, error: body.error ?? `Erreur ${res.status}`, fields: body.fields };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "Réseau indisponible." };
  }
}

export function CardEditor({
  initial,
  isAdmin,
  baseUrl,
  walletBadgeSrc,
}: {
  initial: CardDto;
  isAdmin: boolean;
  baseUrl: string;
  walletBadgeSrc: string | null;
}) {
  const [card, setCard] = useState(initial);
  const [form, setForm] = useState<Form>(() => toForm(initial));
  const [saved, setSaved] = useState<Form>(() => toForm(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"fields" | "share">("fields");
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const isAscenzia = card.kind === "ascenzia";
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const set =
    <K extends keyof Form>(key: K) =>
    (value: Form[K]) =>
      setForm((f) => ({ ...f, [key]: value }));
  const setLink = (i: number, patch: Partial<LinkForm>) =>
    setForm((f) => ({ ...f, links: f.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const moveLink = (i: number, d: -1 | 1) =>
    setForm((f) => {
      const links = [...f.links];
      const j = i + d;
      if (j < 0 || j >= links.length) return f;
      [links[i], links[j]] = [links[j]!, links[i]!];
      return { ...f, links };
    });

  const themeIssues = useMemo(
    () =>
      isAscenzia
        ? []
        : validateThemeSettings({
            kind: card.kind,
            themeId: form.themeId,
            accentColor: form.accentColor,
          }),
    [isAscenzia, card.kind, form.themeId, form.accentColor],
  );

  const preview = useMemo(
    () =>
      toViewModel(
        {
          kind: card.kind,
          slug: card.slug,
          firstName: form.firstName,
          lastName: form.lastName,
          title: form.title,
          company: form.company,
          tagline: form.tagline,
          phone: normalizePhone(form.phone) ?? (form.phone || null),
          email: form.email,
          website: form.website,
          address: {
            street: form.street,
            postalCode: form.postalCode,
            city: form.city,
            country: form.country,
          },
          photoPath: card.photoPath,
          logoPath: card.logoPath,
          backgroundPath: card.backgroundPath,
          themeId: form.themeId,
          accentColor: /^#[0-9a-f]{6}$/i.test(form.accentColor) ? form.accentColor : null,
          links: form.links.filter((l) => l.url.trim()),
        },
        { photoUrl: card.photoUrl, logoUrl: card.logoUrl, backgroundUrl: card.backgroundUrl },
      ),
    [card, form],
  );

  async function save() {
    setSaving(true);
    setStatus(null);
    const res = await api<CardDto>(`/api/admin/cards/${card.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPayload(form, card, isAdmin)),
    });
    setSaving(false);
    if (!res.ok) {
      setErrors(res.fields ?? {});
      setStatus({ kind: "error", text: res.error });
      return;
    }
    setErrors({});
    setCard(res.data);
    const next = toForm(res.data);
    setForm(next);
    setSaved(next);
    setStatus({ kind: "ok", text: "Carte enregistrée. La page publique est à jour." });
  }

  async function upload(kind: "photo" | "logo" | "background", file: File, crop?: Crop) {
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ kind: "error", text: "Fichier trop lourd (5 Mo maximum)." });
      return;
    }
    setUploading(kind);
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file);
    if (crop) body.set("crop", JSON.stringify(crop));
    const res = await api<CardDto>(`/api/admin/cards/${card.id}/media`, { method: "POST", body });
    setUploading(null);
    if (!res.ok) return setStatus({ kind: "error", text: res.error });
    setPendingPhoto(null);
    setCard(res.data);
    setStatus({ kind: "ok", text: "Image enregistrée." });
  }

  async function removeMedia(kind: "photo" | "logo" | "background") {
    const res = await api<CardDto>(`/api/admin/cards/${card.id}/media?kind=${kind}`, {
      method: "DELETE",
    });
    if (!res.ok) return setStatus({ kind: "error", text: res.error });
    setCard(res.data);
  }

  const passStale = card.passStale;

  return (
    <main className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="text-sm underline-offset-2 hover:underline"
            style={{ color: "var(--fg-muted)" }}
          >
            ← Cartes
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {card.firstName} {card.lastName}
          </h1>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {isAscenzia ? "Carte Ascenzia" : "Carte perso"} ·{" "}
            <a className="underline" href={`/${card.slug}`} target="_blank" rel="noopener">
              /{card.slug}
            </a>
          </p>
        </div>
        <div role="tablist" className="flex gap-2">
          {(["fields", "share"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              className={`btn btn-sm ${tab === k ? "btn-gold" : "btn-secondary"}`}
              onClick={() => setTab(k)}
            >
              {k === "fields" ? "Champs" : "Partage"}
            </button>
          ))}
        </div>
      </div>

      {passStale ? (
        <div role="status" className="panel flex items-start gap-3 p-4 text-sm">
          <TriangleAlert
            aria-hidden="true"
            size={20}
            strokeWidth={1.6}
            className="shrink-0 text-gold-600"
          />
          <p>
            La carte a changé depuis le dernier pass Wallet : le pass installé est périmé.{" "}
            <a className="underline" href={`/api/cards/${card.slug}/pass`}>
              Régénérer et réinstaller le pass
            </a>{" "}
            (il remplacera l&apos;ancien).
          </p>
        </div>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid gap-6">
          {tab === "share" ? (
            <SharePanel slug={card.slug} baseUrl={baseUrl} isActive={card.isActive} />
          ) : (
            <form
              className="grid gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <section className="panel grid gap-4 p-4">
                <p className="eyebrow">Photo</p>
                {pendingPhoto ? (
                  <PhotoCropper
                    file={pendingPhoto}
                    busy={uploading === "photo"}
                    onCancel={() => setPendingPhoto(null)}
                    onConfirm={(crop) => void upload("photo", pendingPhoto, crop)}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => photoInput.current?.click()}
                    >
                      <Upload aria-hidden="true" size={16} />
                      {card.photoUrl ? "Changer la photo" : "Ajouter une photo"}
                    </button>
                    {card.photoUrl ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void removeMedia("photo")}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                        Retirer
                      </button>
                    ) : null}
                    <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      JPEG, PNG ou WebP, 5 Mo max.
                    </span>
                  </div>
                )}
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Choisir une photo"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPendingPhoto(f);
                    e.target.value = "";
                  }}
                />
              </section>

              <section className="panel grid gap-4 p-4 sm:grid-cols-2">
                <p className="eyebrow sm:col-span-2">Identité</p>
                <Field
                  label="Prénom"
                  name="firstName"
                  value={form.firstName}
                  onChange={set("firstName")}
                  error={errors.firstName}
                  required
                  autoComplete="given-name"
                />
                <Field
                  label="Nom"
                  name="lastName"
                  value={form.lastName}
                  onChange={set("lastName")}
                  error={errors.lastName}
                  required
                  autoComplete="family-name"
                />
                <Field
                  label="Fonction"
                  name="title"
                  value={form.title}
                  onChange={set("title")}
                  error={errors.title}
                />
                <Field
                  label="Société"
                  name="company"
                  value={form.company}
                  onChange={set("company")}
                  error={errors.company}
                  disabled={isAscenzia}
                  hint={isAscenzia ? "Imposée sur une carte Ascenzia." : undefined}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Phrase libre"
                    name="tagline"
                    value={form.tagline}
                    onChange={set("tagline")}
                    error={errors.tagline}
                    maxLength={120}
                    hint="Une ligne, 120 caractères maximum."
                  />
                </div>
              </section>

              <section className="panel grid gap-4 p-4 sm:grid-cols-2">
                <p className="eyebrow sm:col-span-2">Coordonnées</p>
                <Field
                  label="Téléphone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  error={errors.phone}
                  hint="Ex. 06 12 34 56 78 ou +44 20 7946 0000"
                  autoComplete="tel"
                />
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  error={errors.email}
                  autoComplete="email"
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Site web"
                    name="website"
                    value={form.website}
                    onChange={set("website")}
                    error={errors.website}
                    placeholder="https://"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Adresse (optionnelle)"
                    name="street"
                    value={form.street}
                    onChange={set("street")}
                    error={errors["address.street"]}
                    autoComplete="street-address"
                  />
                </div>
                <Field
                  label="Code postal"
                  name="postalCode"
                  value={form.postalCode}
                  onChange={set("postalCode")}
                  error={errors["address.postalCode"]}
                />
                <Field
                  label="Ville"
                  name="city"
                  value={form.city}
                  onChange={set("city")}
                  error={errors["address.city"]}
                />
                <Field
                  label="Pays"
                  name="country"
                  value={form.country}
                  onChange={set("country")}
                  error={errors["address.country"]}
                />
              </section>

              <section className="panel grid gap-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">
                    Liens ({form.links.length}/{MAX_LINKS})
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={form.links.length >= MAX_LINKS}
                    onClick={() =>
                      set("links")([
                        ...form.links,
                        { kind: "linkedin", label: "LinkedIn", url: "", isVisible: true },
                      ])
                    }
                  >
                    <Plus aria-hidden="true" size={16} />
                    Ajouter
                  </button>
                </div>
                {errors.links ? <p className="field-error">{errors.links}</p> : null}
                {form.links.map((l, i) => (
                  <fieldset
                    key={i}
                    className="grid gap-3 rounded-lg p-3 sm:grid-cols-[140px_1fr]"
                    style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}
                  >
                    <legend className="sr-only">Lien {i + 1}</legend>
                    <label className="grid gap-1 text-sm">
                      Type
                      <select
                        className="input"
                        value={l.kind}
                        onChange={(e) => {
                          const kind = e.target.value as LinkKind;
                          const auto = l.label === LINK_KIND_LABELS[l.kind] || !l.label;
                          setLink(i, { kind, ...(auto ? { label: LINK_KIND_LABELS[kind] } : {}) });
                        }}
                      >
                        {LINK_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {LINK_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Libellé"
                      name={`links.${i}.label`}
                      value={l.label}
                      onChange={(v) => setLink(i, { label: v })}
                      error={errors[`links.${i}.label`]}
                      maxLength={40}
                    />
                    <div className="sm:col-span-2">
                      <Field
                        label="URL"
                        name={`links.${i}.url`}
                        value={l.url}
                        onChange={(v) => setLink(i, { url: v })}
                        error={errors[`links.${i}.url`]}
                        placeholder="https://"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                      <label className="mr-auto flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={l.isVisible}
                          onChange={(e) => setLink(i, { isVisible: e.target.checked })}
                        />
                        Visible
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        aria-label="Monter"
                        onClick={() => moveLink(i, -1)}
                        disabled={i === 0}
                      >
                        <ArrowUp aria-hidden="true" size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        aria-label="Descendre"
                        onClick={() => moveLink(i, 1)}
                        disabled={i === form.links.length - 1}
                      >
                        <ArrowDown aria-hidden="true" size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        aria-label="Supprimer le lien"
                        onClick={() => set("links")(form.links.filter((_, j) => j !== i))}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </fieldset>
                ))}
              </section>

              <section className="panel grid gap-4 p-4">
                <p className="eyebrow">Apparence</p>
                {isAscenzia ? (
                  <p className="text-sm">
                    Thème Ascenzia verrouillé : logo, couleurs et polices de la charte 2026. Le slug
                    n&apos;est pas modifiable.
                  </p>
                ) : (
                  <>
                    {isAdmin ? (
                      <Field
                        label="Slug"
                        name="slug"
                        value={form.slug}
                        onChange={(v) => set("slug")(v.toLowerCase())}
                        error={errors.slug}
                        hint="Changer le slug casse les QR codes et tags NFC déjà diffusés."
                      />
                    ) : null}
                    <fieldset className="grid gap-2">
                      <legend className="mb-1 text-sm font-medium">Thème</legend>
                      {PERSONAL_THEME_IDS.map((id) => (
                        <label key={id} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="themeId"
                            value={id}
                            checked={form.themeId === id}
                            onChange={() => set("themeId")(id)}
                          />
                          {THEME_LABELS[id]}
                        </label>
                      ))}
                    </fieldset>
                    <div className="grid gap-1">
                      <label htmlFor="f-accent" className="text-sm font-medium">
                        Couleur d&apos;accent
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          aria-label="Choisir la couleur d'accent"
                          value={
                            /^#[0-9a-f]{6}$/i.test(form.accentColor)
                              ? form.accentColor
                              : DEFAULT_ACCENT
                          }
                          onChange={(e) => set("accentColor")(e.target.value)}
                          className="h-11 w-14 rounded"
                        />
                        <input
                          id="f-accent"
                          className="input max-w-[140px] font-mono"
                          value={form.accentColor}
                          onChange={(e) => set("accentColor")(e.target.value)}
                        />
                      </div>
                      {themeIssues.length ? (
                        <ul className="field-error mt-1 list-disc pl-5">
                          {themeIssues.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                          Contraste conforme WCAG AA (4,5:1).
                        </p>
                      )}
                      {errors.accentColor ? (
                        <p className="field-error">{errors.accentColor}</p>
                      ) : null}
                    </div>
                    <MediaRow
                      label="Logo"
                      hasMedia={!!card.logoUrl}
                      busy={uploading === "logo"}
                      onPick={(f) => void upload("logo", f)}
                      onRemove={() => void removeMedia("logo")}
                    />
                    {form.themeId === "photo" ? (
                      <MediaRow
                        label="Image de fond"
                        hasMedia={!!card.backgroundUrl}
                        busy={uploading === "background"}
                        onPick={(f) => void upload("background", f)}
                        onRemove={() => void removeMedia("background")}
                      />
                    ) : null}
                  </>
                )}
              </section>

              <div
                className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl p-3"
                style={{ background: "var(--surface)", boxShadow: "0 8px 24px rgba(17,21,29,.18)" }}
              >
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={saving || !dirty || themeIssues.length > 0}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
                {dirty ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setForm(saved);
                      setErrors({});
                    }}
                  >
                    Annuler les modifications
                  </button>
                ) : null}
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-sm ${status?.kind === "error" ? "field-error" : ""}`}
                >
                  {status?.text ?? (dirty ? "Modifications non enregistrées." : "")}
                </p>
              </div>
            </form>
          )}
        </div>

        <aside className="lg:sticky lg:top-20" aria-label="Aperçu mobile">
          <p className="eyebrow mb-2">Aperçu mobile</p>
          <div
            className="overflow-hidden rounded-[32px] p-4"
            style={{
              background: "var(--page-bg)",
              boxShadow: "inset 0 0 0 1px var(--hairline)",
              maxWidth: 400,
            }}
          >
            <CardFace card={preview} />
            <PrimaryActions
              card={preview}
              interactive={false}
              walletSlot={
                <span className="wallet-fallback" aria-hidden="true">
                  {walletBadgeSrc
                    ? "Ajouter à Apple Wallet (badge officiel)"
                    : "Ajouter à Apple Wallet"}
                </span>
              }
            />
            <LinkList card={preview} interactive={false} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function MediaRow({
  label,
  hasMedia,
  busy,
  onPick,
  onRemove,
}: {
  label: string;
  hasMedia: boolean;
  busy: boolean;
  onPick: (f: File) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="min-w-[110px] text-sm font-medium">{label}</span>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => ref.current?.click()}
        disabled={busy}
      >
        <Upload aria-hidden="true" size={16} />
        {busy ? "Envoi…" : hasMedia ? "Remplacer" : "Ajouter"}
      </button>
      {hasMedia ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRemove}>
          <Trash2 aria-hidden="true" size={16} />
          Retirer
        </button>
      ) : null}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={`Choisir : ${label}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
