import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions et données personnelles" };

/**
 * Mention d'information (N-08, N-09). Les informations légales de l'éditeur (raison sociale,
 * siège, immatriculation) restent à compléter par Ascenzia : elles ne sont pas inventées ici.
 */
export default function Mentions() {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-12 leading-relaxed">
      <h1 className="text-2xl font-semibold">Mentions et données personnelles</h1>
      <h2 className="mt-8 font-semibold">Éditeur</h2>
      <p className="mt-2">
        Ce service de cartes de visite numériques est édité par Ascenzia. Responsable de traitement
        : Laurent Fontaine.
      </p>
      <h2 className="mt-8 font-semibold">Données traitées sur cette page</h2>
      <ul className="mt-2 list-disc pl-5">
        <li>Aucun cookie ni traceur tiers n&apos;est déposé.</li>
        <li>
          Chaque consultation est comptée avec son horodatage, son canal d&apos;accès (QR code,
          Wallet, NFC, lien) et un hachage salé et tronqué de l&apos;adresse IP, qui ne permet pas
          de la retrouver. Ces données sont supprimées après 90 jours.
        </li>
        <li>
          Finalité : mesurer l&apos;usage des cartes de visite. Base légale : intérêt légitime.
        </li>
        <li>Hébergement dans l&apos;Union européenne (Francfort).</li>
      </ul>
      <h2 className="mt-8 font-semibold">Vos droits</h2>
      <p className="mt-2">
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;opposition et
        d&apos;effacement. Pour l&apos;exercer, écrivez à{" "}
        <a className="underline" href="mailto:laurent.fontaine@ascenzia.fr">
          laurent.fontaine@ascenzia.fr
        </a>
        .
      </p>
    </main>
  );
}
