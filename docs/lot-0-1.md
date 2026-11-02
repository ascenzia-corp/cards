# Note de version : lots 0 et 1

Les lots 0 (socle) et 1 (cartes de Laurent) sont livrés dans une seule pull request, la session de
développement ne disposant que d'une branche. Les commits restent séparés par lot.

## Fait

| Exigence         | Implémentation                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01             | Slug `^[a-z0-9.-]{3,40}$`, forme `prenom.nom` (homonymes `prenom.nom2`) pour une carte Ascenzia, slugs réservés, contrainte aussi en base. Racine en 302 vers ascenzia.ai |
| F-02, F-05       | Tous les champs ; champs vides masqués ; `tel:`, `mailto:`, liens externes `noopener`                                                                                     |
| F-03             | Enregistrer, Appeler, E-mail et Wallet visibles sans défiler, vérifié jusqu'à 320×568                                                                                     |
| F-04             | vCard 3.0 manuelle : CRLF, pliage 75 octets UTF-8, échappement, photo base64, liens libellés, note avec l'URL                                                             |
| F-06, F-33       | 4 thèmes en code ; Ascenzia verrouillé (interface, API, base) ; contraste 4,5:1 vérifié client et serveur                                                                 |
| F-07             | Open Graph et Twitter Card, image 1200×630 générée aux couleurs du thème                                                                                                  |
| F-10             | QR niveau M, PNG 1024 px et SVG, avec ou sans logo central ; lisibilité vérifiée par décodage en test                                                                     |
| F-11, section 6  | `.pkpass` generic signé, serial stable, couleurs `rgb()`, verso avec liens, icon/logo/thumbnail en @1x/@2x/@3x                                                            |
| F-30             | Lien magique Auth.js, sessions base de 30 jours, rôles admin et membre, message neutre identique (R-12)                                                                   |
| F-31, F-32       | Éditeur avec aperçu mobile en direct, recadrage carré, variantes générées, type réel vérifié, 5 Mo max                                                                    |
| N-01, N-02       | Page statique revalidée à la modification, CSS inliné, photo préchargée                                                                                                   |
| N-04, N-05, N-07 | Secrets en variables uniquement ; CSP (à nonce sur l'admin), HSTS, nosniff ; contrôle d'origine sur les mutations ; Zod partout                                           |
| N-11, N-13       | Cibles 48 px, libellés, `alt`, focus visible ; JSON-LD Person, robots.txt                                                                                                 |
| N-15             | TypeScript strict, ESLint et Prettier en pré-commit, 67 tests Vitest, 10 parcours Playwright, CI                                                                          |

Réalisés en avance car peu coûteux et nécessaires à la cohérence du lot 1 :

- compteur de vues par canal sans cookie (F-09, nécessaire à R-05) avec IP hachée et purge à 90 jours (N-09) ;
- limitation de débit du pass (20 par heure et par IP) et des liens magiques (3 par heure), comptée sur les tables existantes (N-06) ;
- avertissement « pass à régénérer » (F-36) et alerte d'expiration du certificat à 30 jours (section 6) ;
- onglet Partage avec la consigne NFC (F-13 en version courte).

## Mesures locales

Lighthouse 12, profil mobile par défaut (Slow 4G : 1,6 Mbit/s, 150 ms), serveur de production local.

| Carte             | Performance | Accessibilité | LCP simulé  | LCP mesuré, étranglement appliqué | Poids total |
| ----------------- | ----------- | ------------- | ----------- | --------------------------------- | ----------- |
| /laurent.fontaine | 99          | 100           | 2,0 s       | 1,2 s                             | 205 Ko      |
| /laurent          | 97 à 99     | 100           | 1,9 à 2,4 s | 1,3 s                             | 164 Ko      |

Le LCP simulé par Lighthouse dépasse la cible N-01 de 1,5 s ; le LCP mesuré avec étranglement réel la
respecte. À confirmer en production, où la photo est servie par le CDN Vercel avec un cache immuable.

## Écarts assumés

- **Bouton « Laisser mes coordonnées »** (cité en F-03) : absent tant que le formulaire du lot 3 n'existe pas,
  pour ne pas afficher un bouton sans effet.
- **Icônes LinkedIn, X, Instagram** : Lucide ne fournit plus de logos de marques ; icônes génériques Lucide
  avec le libellé du lien.
- **Badge officiel Apple Wallet** : téléchargeable seulement après acceptation des conditions Apple. À déposer
  dans `public/wallet/` ; un bouton noir sobre le remplace d'ici là.
- **robots.txt** : `/api` est interdit sauf l'image Open Graph et les photos, sans quoi LinkedIn ne peut pas
  afficher l'aperçu (F-07, R-08).
- **Mentions** : la page indique le responsable de traitement et le traitement des vues ; raison sociale,
  siège et immatriculation d'Ascenzia restent à fournir.

## Hypothèses sur les questions ouvertes (section 14)

- Carte perso de Laurent sur `/laurent` ; homonymes en `prenom.nom2`.
- Seul un admin crée des cartes, y compris perso (lot 2).
- Pas de version anglaise au lot 1 ; libellés externalisés dans `lib/i18n.ts`.
- Lot 3 non engagé.

## Reste à faire avant recette du lot 1

1. Prérequis section 11 : DNS, Apple Developer et certificats, Supabase, Resend, projet Vercel.
2. Contenus : le seed reprend la signature de Laurent (fonction, téléphone, liens, photo ; logo sur la carte personnelle). À vérifier dans l'admin ; l'import de la photo et du logo demande un accès réseau au moment du seed.
3. Recette sur iPhone réel : R-01 à R-09 et R-15. R-04 et R-06 ne peuvent être validés qu'avec le vrai certificat.

## Tester à la main

1. `pnpm db:migrate && pnpm db:seed`, puis `pnpm build && pnpm start`.
2. Ouvrir `/laurent.fontaine?src=qr` sur un téléphone : le paramètre disparaît, une vue « qr » est enregistrée.
3. « Enregistrer le contact » : la fiche Contacts est préremplie.
4. Sur iPhone Safari, « Ajouter à Apple Wallet » : la feuille Wallet s'ouvre (certificat réel requis).
5. `/login` avec l'adresse admin, lien reçu par e-mail, puis édition d'une carte et onglet Partage.
6. Tenter un thème sur la carte Ascenzia via l'API : réponse 403.
