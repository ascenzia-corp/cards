# Ascenzia Cards

Cartes de visite numériques Ascenzia : une page publique par carte sur `https://cards.ascenzia.ai/<slug>`,
une vCard, un QR code et un pass Apple Wallet signé. Référence fonctionnelle : le cahier des charges
« Carte de visite numérique personnelle » (identifiants F-xx, N-xx et R-xx cités dans le code et les commits).

Stack : Next.js 16 (App Router, TypeScript strict, Tailwind 4), Postgres (Supabase, Drizzle), Auth.js v5
(lien magique via Resend), `passkit-generator` pour le pass, `sharp` pour les images. Hébergement Vercel `fra1`.

## Mise en route locale (≈ 15 minutes)

Prérequis : Node 22, pnpm 10, un Postgres 16 local (ou le projet Supabase).

```bash
pnpm install
cp .env.example .env.local   # puis renseigner les valeurs, voir ci-dessous
pnpm db:migrate              # tables + bucket privé Supabase si configuré
pnpm db:seed                 # administrateur + cartes /laurent.fontaine et /laurent
pnpm dev                     # http://localhost:3000/laurent.fontaine
```

En local, `LOCAL_STORAGE_DIR=.local-storage` remplace Supabase Storage par le disque (refusé sur Vercel).
Sans clé Resend valide, aucun lien magique ne part : pour tester l'admin en local, insérer une session
en base comme le fait `tests/e2e/global-setup.ts`.

## Variables d'environnement

Toutes sont décrites dans `.env.example`. Aucune n'a de valeur par défaut dans le code : une variable
manquante produit une erreur explicite (réponse 503 côté API, message dans l'admin pour le pass).

| Variable                                                                                   | Rôle                                                              |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `DATABASE_URL`                                                                             | Pooler Supabase (port 6543, mode transaction)                     |
| `DATABASE_URL_DIRECT`                                                                      | Connexion directe (port 5432), utilisée par `db:migrate`          |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`                     | Stockage privé des photos, logos et fonds                         |
| `ADMIN_EMAILS`, `ALLOWED_EMAIL_DOMAINS`                                                    | Admins ; domaines autorisés pour les membres invités              |
| `AUTH_SECRET`                                                                              | Secret Auth.js (`openssl rand -base64 32`)                        |
| `RESEND_API_KEY`, `MAIL_FROM`                                                              | E-mails de connexion et alertes                                   |
| `APPLE_TEAM_ID`, `APPLE_PASS_TYPE_ID`                                                      | Identifiants Apple                                                |
| `APPLE_PASS_CERT_B64`, `APPLE_PASS_KEY_B64`, `APPLE_PASS_KEY_PASSPHRASE`, `APPLE_WWDR_B64` | Certificats PEM en base64                                         |
| `PUBLIC_BASE_URL`                                                                          | `https://cards.ascenzia.ai`                                       |
| `IP_HASH_SALT`                                                                             | Sel du hachage d'IP du compteur de vues                           |
| `CRON_SECRET`                                                                              | Jeton de `/api/cron/purge` (Vercel Cron l'envoie automatiquement) |

## Certificats Apple Wallet

1. Developer Portal, Identifiers : créer le Pass Type ID `pass.ai.ascenzia.cards`.
2. Créer le certificat associé à partir d'un CSR (Trousseau d'accès), l'importer, puis exporter certificat
   et clé privée en `pass.p12`.
3. Télécharger le certificat intermédiaire Apple WWDR G4 (`AppleWWDRCAG4.cer`).
4. Convertir et encoder :

```bash
openssl pkcs12 -in pass.p12 -clcerts -nokeys -out certificate.pem -legacy
```

```bash
openssl pkcs12 -in pass.p12 -nocerts -out key.pem -legacy
```

```bash
openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
```

```bash
for f in certificate key wwdr; do base64 -w0 $f.pem > $f.b64; done
```

5. Copier `certificate.b64`, `key.b64` et `wwdr.b64` dans `APPLE_PASS_CERT_B64`, `APPLE_PASS_KEY_B64` et
   `APPLE_WWDR_B64` sur Vercel ; la phrase de passe de `key.pem` dans `APPLE_PASS_KEY_PASSPHRASE`. Ne jamais
   commiter ces fichiers (`*.pem` et `*.p12` sont ignorés par git).

**Renouvellement.** L'admin affiche la date d'expiration du certificat et alerte 30 jours avant. Refaire les
étapes 2, 4 et 5 avec un nouveau certificat pour le même Pass Type ID, puis redéployer. Les pass déjà installés
restent lisibles ; seuls les nouveaux pass exigent un certificat valide.

**Test obligatoire sur iPhone réel** (R-04) : la signature Apple n'est vérifiée de bout en bout que par Wallet.
Les tests automatisés vérifient la structure (ZIP, manifest SHA-1, signature PKCS#7 détachée) avec un
certificat auto-signé.

Badge « Ajouter à Apple Wallet » : déposer le fichier officiel d'Apple dans `public/wallet/` (voir le README
de ce dossier). En son absence, un bouton noir sobre le remplace.

## Déploiement Vercel

1. Projet Vercel relié au dépôt, région des fonctions `fra1` (déjà fixée dans `vercel.json`).
2. Domaine `cards.ascenzia.ai` : CNAME vers la cible indiquée par Vercel à l'ajout du domaine.
3. Variables d'environnement de production renseignées, puis `pnpm db:migrate` et `pnpm db:seed` une fois,
   depuis un poste avec `DATABASE_URL_DIRECT`.
4. Resend : domaine d'envoi vérifié (SPF, DKIM, DMARC).
5. Vercel Cron appelle `/api/cron/purge` chaque nuit (purge des événements de plus de 90 jours).

## Scripts

| Commande                                              | Effet                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`, `pnpm build`, `pnpm start`                | Développement, build, production                             |
| `pnpm lint`, `pnpm format`, `pnpm typecheck`          | Qualité (lint et Prettier aussi en pré-commit)               |
| `pnpm test`                                           | Vitest : vCard, pass, QR, thèmes, slug, droits, routes admin |
| `pnpm test:e2e`                                       | Playwright mobile, serveur lancé et base seedée requis       |
| `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed` | Migrations Drizzle et données initiales                      |

## Organisation du code

```
app/(public)/[slug]        page publique (rendu statique, revalidée à chaque modification)
app/admin                  administration et espace membre
app/api/cards/[slug]/…     vcard, pass, qr, og, media, view (fichiers publics générés)
app/api/admin/cards/[id]   lecture, édition et médias d'une carte (session requise)
lib/{pass,vcard,qr,themes} logique métier testable hors framework
lib/authz.ts               règles de droits et verrous de la carte Ascenzia
lib/db                     schéma Drizzle ; migrations SQL dans drizzle/
```

L'avancement par lot et les points ouverts sont dans `docs/`.
