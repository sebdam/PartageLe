/**
 * Modèle de données du partage (cf. CONCEPT.md).
 *
 * Le « tout » n'est pas un nombre mais un calcul : des biens (avec une éventuelle
 * quote-part), un passif, des bénéficiaires (personnes et groupes), et des
 * attributions spécifiques de biens. Le même modèle sert plusieurs contextes
 * (succession, note de la vie courante…) — cf. contexte.ts.
 */

import type { Contexte } from './contexte';

export type Id = string;

/** Lien avec le défunt (succession) — sert au calcul de la réserve héréditaire. */
export type Lien = 'enfant' | 'conjoint' | 'autre';

export const LIENS = [
  { value: 'enfant', label: 'Enfant' },
  { value: 'conjoint', label: 'Conjoint' },
  { value: 'autre', label: 'Autre' },
] as const;

export const CATEGORIES = [
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'compte', label: 'Compte / liquidités' },
  { value: 'vehicule', label: 'Véhicule' },
  { value: 'mobilier', label: 'Mobilier' },
  { value: 'societe', label: 'Parts de société' },
  { value: 'autre', label: 'Autre' },
] as const;

export type Categorie = (typeof CATEGORIES)[number]['value'];

/** Un bien / article. En succession, seule la quote-part du défunt entre dans la masse. */
export interface Bien {
  id: Id;
  nom: string;
  categorie: Categorie;
  /** Valeur totale (ou prix), saisie en euros (chaîne décimale). */
  valeurEuros: string;
  /** Part possédée par le défunt (ex. 1/2). En contexte « note », vaut 1/1. */
  quotePart: { n: number; d: number };
}

/** Une dette / un frais, soustrait de l'actif. */
export interface Passif {
  id: Id;
  libelle: string;
  montantEuros: string;
}

/** Comment une part est exprimée, par rapport à son contenant. */
export type Part =
  | { type: 'fraction'; n: number; d: number }
  | { type: 'pourcent'; valeur: string }
  | { type: 'reste' };

/** Membre d'un groupe : une personne (feuille) ou un sous-groupe (représentation). */
export type Membre =
  | { kind: 'personne'; id: Id; nom: string; lien?: Lien }
  | { kind: 'sousGroupe'; id: Id; nom: string; membres: Membre[] };

/** Bénéficiaire de premier rang : une personne, ou un groupe réparti à parts égales. */
export type Beneficiaire =
  | { kind: 'personne'; id: Id; nom: string; part: Part; lien?: Lien }
  | { kind: 'groupe'; id: Id; nom: string; part: Part; membres: Membre[] };

/** Attribution d'un bien à un bénéficiaire (feuille), avant le partage du reste. */
export interface Attribution {
  id: Id;
  bienId: Id;
  beneficiaireId: Id;
  /** sur part = avance imputée (génère une soulte) ; hors part = en plus (préciput). */
  imputation: 'surPart' | 'horsPart';
}

export interface Partage {
  contexte: Contexte;
  titre: string;
  devise: 'EUR';
  biens: Bien[];
  passif: Passif[];
  beneficiaires: Beneficiaire[];
  attributions: Attribution[];
}

// --- Identifiants & fabriques (utilisés par l'UI) ---------------------------

let _seq = 0;
export function uid(prefix = 'id'): Id {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

export function nouveauBien(): Bien {
  return { id: uid('bien'), nom: '', categorie: 'autre', valeurEuros: '', quotePart: { n: 1, d: 1 } };
}

export function nouveauPassif(): Passif {
  return { id: uid('passif'), libelle: '', montantEuros: '' };
}

export function nouvellePersonne(nom = '', part: Part = { type: 'reste' }): Beneficiaire {
  return { kind: 'personne', id: uid('pers'), nom, part, lien: 'autre' };
}

export function nouveauGroupe(nom = '', part: Part = { type: 'reste' }): Beneficiaire {
  return { kind: 'groupe', id: uid('grp'), nom, part, membres: [] };
}

export function nouveauMembrePersonne(nom = ''): Membre {
  return { kind: 'personne', id: uid('m'), nom, lien: 'autre' };
}

export function nouveauSousGroupe(nom = ''): Membre {
  return { kind: 'sousGroupe', id: uid('sg'), nom, membres: [] };
}

export function partageVide(contexte: Contexte): Partage {
  return { contexte, titre: '', devise: 'EUR', biens: [], passif: [], beneficiaires: [], attributions: [] };
}

/** Liste à plat des personnes (feuilles) avec un libellé, pour les attributions. */
export function listerPersonnes(s: Partage): { id: Id; nom: string }[] {
  const out: { id: Id; nom: string }[] = [];
  const visitMembre = (m: Membre, prefix: string) => {
    if (m.kind === 'personne') out.push({ id: m.id, nom: prefix + (m.nom || 'Sans nom') });
    else m.membres.forEach((x) => visitMembre(x, `${prefix}${m.nom || 'Groupe'} › `));
  };
  for (const b of s.beneficiaires) {
    if (b.kind === 'personne') out.push({ id: b.id, nom: b.nom || 'Sans nom' });
    else b.membres.forEach((m) => visitMembre(m, `${b.nom || 'Groupe'} › `));
  }
  return out;
}
