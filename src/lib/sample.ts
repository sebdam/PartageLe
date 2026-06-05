import type { Succession } from './model';

/**
 * L'exemple « fil rouge » du concept : la succession de M. X.
 * Sert de données par défaut pour que l'app montre tout de suite quelque chose.
 *
 * Masse = 180 000 (½ maison) + 24 000 (voiture) + 36 000 (compte) = 240 000 €.
 * Madame Y : 1/4 = 60 000 €. Les 9 enfants : le reste, à parts égales = 20 000 € chacun.
 * Paul reçoit la voiture (24 000 €, sur part) ⇒ il verse une soulte de 4 000 €.
 */
export function successionExemple(): Succession {
  const enfants = ['Paul', 'Alice', 'Bruno', 'Chloé', 'David', 'Emma', 'Hugo', 'Inès', 'Jules'];
  return {
    titre: 'Succession de M. X',
    devise: 'EUR',
    biens: [
      { id: 'b_maison', nom: 'Maison', categorie: 'immobilier', valeurEuros: '360000', quotePart: { n: 1, d: 2 } },
      { id: 'b_voiture', nom: 'Voiture', categorie: 'vehicule', valeurEuros: '24000', quotePart: { n: 1, d: 1 } },
      { id: 'b_compte', nom: 'Compte bancaire', categorie: 'compte', valeurEuros: '36000', quotePart: { n: 1, d: 1 } },
    ],
    passif: [],
    beneficiaires: [
      { kind: 'personne', id: 'p_y', nom: 'Madame Y', part: { type: 'fraction', n: 1, d: 4 } },
      {
        kind: 'groupe',
        id: 'g_enfants',
        nom: 'Les 9 enfants',
        part: { type: 'reste' },
        membres: enfants.map((nom, i) => ({ kind: 'personne', id: `e_${i}`, nom })),
      },
    ],
    attributions: [{ id: 'a_voiture', bienId: 'b_voiture', beneficiaireId: 'e_0', imputation: 'surPart' }],
  };
}
