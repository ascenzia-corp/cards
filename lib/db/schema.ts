/**
 * Schéma Drizzle (section 9). Les tables accounts, sessions et verification_tokens
 * sont celles attendues par l'adaptateur Auth.js.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "member"]);
export const cardKind = pgEnum("card_kind", ["ascenzia", "personal"]);
export const linkKind = pgEnum("link_kind", [
  "linkedin",
  "x",
  "instagram",
  "calendar",
  "website",
  "custom",
]);
export const eventType = pgEnum("event_type", [
  "view",
  "vcard_download",
  "pass_generated",
  "qr_download",
  "contact_submitted",
]);
export const eventSource = pgEnum("event_source", ["qr", "wallet", "nfc", "link", "unknown"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: userRole("role").notNull().default("member"),
    displayName: text("display_name"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    invitedBy: uuid("invited_by"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Colonnes requises par l'adaptateur Auth.js
    name: text("name"),
    emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
    image: text("image"),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export type CardAddress = {
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
};

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    kind: cardKind("kind").notNull(),
    slug: text("slug").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    title: text("title"),
    company: text("company"),
    tagline: text("tagline"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    address: jsonb("address").$type<CardAddress>(),
    photoPath: text("photo_path"),
    logoPath: text("logo_path"),
    themeId: text("theme_id").notNull().default("ink"),
    accentColor: text("accent_color"),
    backgroundPath: text("background_path"),
    passSerial: text("pass_serial").notNull().unique(),
    passGeneratedAt: timestamp("pass_generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cards_user_idx").on(t.userId),
    // Défense en profondeur : les verrous de F-01 et F-06 tiennent aussi en base
    check("cards_slug_format", sql`${t.slug} ~ '^[a-z0-9.-]{3,40}$'`),
    check("cards_ascenzia_theme", sql`${t.kind} <> 'ascenzia' OR ${t.themeId} = 'ascenzia'`),
  ],
);

export const cardLinks = pgTable(
  "card_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    kind: linkKind("kind").notNull(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
  },
  (t) => [index("card_links_card_idx").on(t.cardId, t.position)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    type: eventType("type").notNull(),
    source: eventSource("source").notNull().default("unknown"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_card_created_idx").on(t.cardId, t.createdAt),
    index("events_type_ip_created_idx").on(t.type, t.ipHash, t.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type CardLink = typeof cardLinks.$inferSelect;
export type CardWithLinks = Card & { links: CardLink[] };
