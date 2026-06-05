import type { Contexte } from './contexte';
import type { Partage } from './model';

/**
 * Exemples « fil rouge » par contexte — données par défaut pour que l'app
 * montre tout de suite quelque chose de parlant.
 */
export function exemple(contexte: Contexte): Partage {
  return contexte === 'note' ? noteExemple() : successionExemple();
}

/**
 * Succession de M. X.
 * Masse = 180 000 (½ maison) + 24 000 (voiture) + 36 000 (compte) = 240 000 €.
 * Madame Y (conjoint) : 1/4 = 60 000 €. Les 9 enfants : le reste = 20 000 € chacun.
 * Paul reçoit la voiture (24 000 €, sur part) ⇒ il verse une soulte de 4 000 €.
 */
export function successionExemple(): Partage {
  const enfants = ['Paul', 'Alice', 'Bruno', 'Chloé', 'David', 'Emma', 'Hugo', 'Inès', 'Jules'];
  return {
    contexte: 'succession',
    titre: 'Succession de M. X',
    devise: 'EUR',
    biens: [
      { id: 'b_maison', nom: 'Maison', categorie: 'immobilier', valeurEuros: '360000', quotePart: { n: 1, d: 2 } },
      { id: 'b_voiture', nom: 'Voiture', categorie: 'vehicule', valeurEuros: '24000', quotePart: { n: 1, d: 1 } },
      { id: 'b_compte', nom: 'Compte bancaire', categorie: 'compte', valeurEuros: '36000', quotePart: { n: 1, d: 1 } },
    ],
    passif: [],
    beneficiaires: [
      { kind: 'personne', id: 'p_y', nom: 'Madame Y', part: { type: 'fraction', n: 1, d: 4 }, lien: 'conjoint' },
      {
        kind: 'groupe',
        id: 'g_enfants',
        nom: 'Les 9 enfants',
        part: { type: 'reste' },
        membres: enfants.map((nom, i) => ({ kind: 'personne', id: `e_${i}`, nom, lien: 'enfant' })),
      },
    ],
    attributions: [{ id: 'a_voiture', bienId: 'b_voiture', beneficiaireId: 'e_0', imputation: 'surPart' }],
  };
}

/**
 * Note du resto. Total 66 € pour 3 participants ⇒ 22 € chacun.
 * Alice a réglé Pizza + Pâtes + Vin (54 €), Bob le Dessert (12 €).
 * ⇒ Alice récupère 32 €, Bob doit 10 €, Chloé doit 22 €.
 */
export function noteExemple(): Partage {
  return {
    contexte: 'note',
    titre: 'Resto de samedi',
    devise: 'EUR',
    biens: [
      { id: 'a_pizza', nom: 'Pizza', categorie: 'autre', valeurEuros: '14', quotePart: { n: 1, d: 1 } },
      { id: 'a_pates', nom: 'Pâtes', categorie: 'autre', valeurEuros: '16', quotePart: { n: 1, d: 1 } },
      { id: 'a_vin', nom: 'Vin', categorie: 'autre', valeurEuros: '24', quotePart: { n: 1, d: 1 } },
      { id: 'a_dessert', nom: 'Dessert', categorie: 'autre', valeurEuros: '12', quotePart: { n: 1, d: 1 } },
    ],
    passif: [],
    beneficiaires: [
      { kind: 'personne', id: 'pa_alice', nom: 'Alice', part: { type: 'reste' } },
      { kind: 'personne', id: 'pa_bob', nom: 'Bob', part: { type: 'reste' } },
      { kind: 'personne', id: 'pa_chloe', nom: 'Chloé', part: { type: 'reste' } },
    ],
    attributions: [
      { id: 'pay_1', bienId: 'a_pizza', beneficiaireId: 'pa_alice', imputation: 'surPart' },
      { id: 'pay_2', bienId: 'a_pates', beneficiaireId: 'pa_alice', imputation: 'surPart' },
      { id: 'pay_3', bienId: 'a_vin', beneficiaireId: 'pa_alice', imputation: 'surPart' },
      { id: 'pay_4', bienId: 'a_dessert', beneficiaireId: 'pa_bob', imputation: 'surPart' },
    ],
  };
}
