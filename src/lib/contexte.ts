/**
 * Couche de « contexte » : le même moteur de partage sert plusieurs usages.
 * Le contexte pilote le VOCABULAIRE et les FONCTIONS visibles (la réserve
 * héréditaire n'a de sens qu'en succession, la quote-part qu'en succession…).
 *
 * Note importante sur le mode « note » : une attribution y signifie « qui a PAYÉ »
 * (et non « qui reçoit »). Le moteur calcule toujours `reçu − part` ; selon le
 * contexte, ce solde se lit « verse / reçoit » (succession) ou « doit / récupère »
 * (note). La normalisation du signe pour l'affichage est faite dans le résultat.
 */

export type Contexte = 'succession' | 'note';

export interface Vocabulaire {
  id: Contexte;
  nom: string;
  emoji: string;
  accroche: string;
  landingDesc: string;
  /** Phrase de mise en garde (vide = pas de bandeau). */
  disclaimer: string;

  titrePlaceholder: string;

  sectionBiens: string;
  aideBiens: string;
  bienNomPlaceholder: string;
  labelValeur: string;
  labelQuotePart: string;
  ajoutBien: string;

  sectionPassif: string;
  passifLibellePlaceholder: string;

  sectionBeneficiaires: string;
  aideBeneficiaires: string;
  ajoutPersonne: string;
  ajoutGroupe: string;
  groupeNomPlaceholder: string;
  aideGroupe: string;

  sectionAttributions: string;
  aideAttributions: string;
  attribuer: string;
  /** Préposition entre le bien et la personne (« → » / « payé par »). */
  prepositionAttribution: string;
  labelSurPart: string;
  labelHorsPart: string;

  labelActif: string;
  labelMasse: string;
  labelSoulte: string;
  labelBeneficiaire: string;
  recapTitre: string;
  /** Verbe quand la personne doit décaisser (solde positif après normalisation). */
  verbePaie: string;
  /** Verbe quand la personne reçoit. */
  verbeRecoit: string;
  /** Note explicative sous le récap (vide = rien). */
  noteRecap: string;

  // Fonctions visibles selon le contexte
  montreQuotePart: boolean;
  montrePassif: boolean;
  montreImputation: boolean;
  montreRepresentation: boolean;
  montreReserve: boolean;
}

const succession: Vocabulaire = {
  id: 'succession',
  nom: 'Succession',
  emoji: '⚖️',
  accroche: 'Partager équitablement, sans se battre avec les fractions.',
  landingDesc: 'Répartir un patrimoine entre héritiers : biens, quotes-parts, soultes, réserve héréditaire.',
  disclaimer: 'Outil d’aide à la réflexion familiale. Ne remplace pas un notaire.',
  titrePlaceholder: 'Titre (ex. Succession de M. X)',
  sectionBiens: 'Les biens',
  aideBiens: 'Pour chaque bien : sa valeur totale et la part possédée par le défunt (seule cette part entre dans la succession).',
  bienNomPlaceholder: 'Nom du bien (ex. Maison)',
  labelValeur: 'Valeur totale',
  labelQuotePart: 'Part du défunt',
  ajoutBien: 'Ajouter un bien',
  sectionPassif: 'Le passif',
  passifLibellePlaceholder: 'Dette, frais d’obsèques…',
  sectionBeneficiaires: 'Les héritiers',
  aideBeneficiaires: 'Des personnes et des groupes. Une part s’exprime en fraction, en pourcentage, ou « le reste ».',
  ajoutPersonne: 'Une personne',
  ajoutGroupe: 'Un groupe',
  groupeNomPlaceholder: 'Nom du groupe (ex. Les enfants)',
  aideGroupe: 'Réparti à parts égales entre les membres.',
  sectionAttributions: 'Les attributions',
  aideAttributions: 'Un bien attribué à quelqu’un. « Sur part » = imputé sur sa part (génère une soulte) ; « hors part » = en plus.',
  attribuer: 'Attribuer un bien',
  prepositionAttribution: '→',
  labelSurPart: 'sur part (soulte)',
  labelHorsPart: 'hors part (en plus)',
  labelActif: 'Actif',
  labelMasse: 'Masse à partager',
  labelSoulte: 'Soulte',
  labelBeneficiaire: 'Bénéficiaire',
  recapTitre: 'Soultes à verser',
  verbePaie: 'verse',
  verbeRecoit: 'reçoit',
  noteRecap:
    'Ces versements, ajoutés aux liquidités de la succession, financent les parts des autres héritiers. La trésorerie disponible et l’éventuelle indivision (bien non liquide) ne sont pas modélisées.',
  montreQuotePart: true,
  montrePassif: true,
  montreImputation: true,
  montreRepresentation: true,
  montreReserve: true,
};

const note: Vocabulaire = {
  id: 'note',
  nom: 'Note',
  emoji: '🧾',
  accroche: 'Partager une addition, sans prise de tête.',
  landingDesc: 'Partager une note de la vie courante (resto, courses, cadeau commun…) : qui doit combien à qui.',
  disclaimer: '',
  titrePlaceholder: 'Titre (ex. Resto de samedi)',
  sectionBiens: 'Les articles',
  aideBiens: 'Chaque article (plat, course…) et son prix.',
  bienNomPlaceholder: 'Article (ex. Pizza)',
  labelValeur: 'Prix',
  labelQuotePart: '',
  ajoutBien: 'Ajouter un article',
  sectionPassif: '',
  passifLibellePlaceholder: '',
  sectionBeneficiaires: 'Les participants',
  aideBeneficiaires: 'Qui partage la note. Par défaut, le reste est réparti à parts égales.',
  ajoutPersonne: 'Un participant',
  ajoutGroupe: 'Un groupe',
  groupeNomPlaceholder: 'Nom du groupe',
  aideGroupe: 'Réparti à parts égales entre les membres.',
  sectionAttributions: 'Qui a payé',
  aideAttributions: 'Indique qui a réglé quel article (sert à calculer les remboursements).',
  attribuer: 'Ajouter un paiement',
  prepositionAttribution: 'payé par',
  labelSurPart: '',
  labelHorsPart: '',
  labelActif: 'Total',
  labelMasse: 'Total à partager',
  labelSoulte: 'Solde',
  labelBeneficiaire: 'Participant',
  recapTitre: 'Remboursements',
  verbePaie: 'doit',
  verbeRecoit: 'récupère',
  noteRecap: 'Qui doit verser combien pour équilibrer la note.',
  montreQuotePart: false,
  montrePassif: false,
  montreImputation: false,
  montreRepresentation: false,
  montreReserve: false,
};

export const VOCABULAIRES: Record<Contexte, Vocabulaire> = { succession, note };

export function vocabulaire(c: Contexte): Vocabulaire {
  return VOCABULAIRES[c];
}
