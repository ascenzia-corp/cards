/**
 * Libellés de l'interface, externalisés pour ajouter l'anglais plus tard (section 10).
 * Seul le français est livré en v1.
 */
export const fr = {
  public: {
    saveContact: "Enregistrer le contact",
    call: "Appeler",
    email: "E-mail",
    leaveDetails: "Laisser mes coordonnées",
    addToWallet: "Ajouter à Apple Wallet",
    openInSafari:
      "Si l'ajout à Wallet ne s'ouvre pas, ouvrez cette page dans Safari (menu ··· puis « Ouvrir dans le navigateur »).",
    share: "Partager",
    linkCopied: "Lien copié",
    links: "Liens",
    website: "Site web",
    address: "Adresse",
    legal: "Mentions",
    cardOf: (name: string) => `Carte de visite de ${name}`,
    photoAlt: (name: string) => `Photo de ${name}`,
  },
  notFound: {
    title: "Carte introuvable",
    body: "Cette carte de visite n'existe pas ou n'est plus active.",
    back: "Aller sur ascenzia.ai",
  },
  auth: {
    title: "Connexion",
    intro: "Saisissez votre adresse Ascenzia. Un lien de connexion vous sera envoyé.",
    emailLabel: "Adresse e-mail",
    submit: "Recevoir le lien",
    checkTitle: "Vérifiez votre boîte mail",
    checkBody:
      "Si cette adresse est autorisée, un lien de connexion vient de lui être envoyé. Il est valable 24 heures.",
    errorTitle: "Connexion impossible",
    errorBody: "Le lien est invalide ou a expiré. Demandez-en un nouveau.",
    signOut: "Se déconnecter",
    mailSubject: "Votre lien de connexion Ascenzia Cards",
    mailIntro: "Cliquez sur le bouton ci-dessous pour vous connecter à Ascenzia Cards.",
    mailButton: "Se connecter",
    mailIgnore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
  },
} as const;

export const t = fr;
