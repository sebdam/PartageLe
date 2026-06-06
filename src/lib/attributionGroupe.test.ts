import { describe, it, expect } from 'vitest';
import { calculer } from './compute';
import { encoder, decoder } from './urlState';
import { listerCibles } from './model';
import type { Partage } from './model';

function succ(over: Partial<Partage>): Partage {
  return { contexte: 'succession', titre: 'T', devise: 'EUR', biens: [], passif: [], beneficiaires: [], attributions: [], ...over };
}
const lig = (res: ReturnType<typeof calculer>, id: string) => res.lignes.find((l) => l.id === id)!;
const parNom = (res: ReturnType<typeof calculer>, nom: string) => res.lignes.find((l) => l.nom === nom)!;

describe('attribution à un groupe (à parts égales)', () => {
  // Maison 90 000 € attribuée au groupe des 3 enfants (qui se partagent par ailleurs le reste).
  const s = succ({
    biens: [{ id: 'bMaison', nom: 'Maison', categorie: 'immobilier', valeurEuros: '90000', quotePart: { n: 1, d: 1 } }],
    beneficiaires: [
      {
        kind: 'groupe', id: 'g', nom: 'Enfants', part: { type: 'reste' },
        membres: [
          { kind: 'personne', id: 'a', nom: 'A', lien: 'enfant' },
          { kind: 'personne', id: 'b', nom: 'B', lien: 'enfant' },
          { kind: 'personne', id: 'c', nom: 'C', lien: 'enfant' },
        ],
      },
    ],
    attributions: [{ id: 'at', bienId: 'bMaison', beneficiaireId: 'g', imputation: 'surPart', droit: 'pleine', fraction: { n: 1, d: 1 } }],
  });
  const res = calculer(s);

  it('répartit la valeur à parts égales et le bien est entièrement attribué', () => {
    for (const id of ['a', 'b', 'c']) {
      expect(lig(res, id).biensRecus[0].valeurCents).toBe(3000000n); // 90 000 / 3
      expect(lig(res, id).biensRecus[0].nom).toBe('Maison');
      expect(lig(res, id).montantCents).toBe(3000000n); // chacun 1/3 de la masse
      expect(lig(res, id).soulteCents).toBe(0n); // reçu = part ⇒ pas de soulte
    }
    expect(res.avertissements.join(' ')).not.toContain('réparti'); // bien réparti à 100 %
  });

  it('arrondit au centime près (somme exacte) sur un montant non divisible', () => {
    const s2 = succ({
      biens: [{ id: 'x', nom: 'Bien', categorie: 'autre', valeurEuros: '100000', quotePart: { n: 1, d: 1 } }],
      beneficiaires: [
        {
          kind: 'groupe', id: 'g', nom: 'Trio', part: { type: 'reste' },
          membres: [
            { kind: 'personne', id: 'u', nom: 'U' },
            { kind: 'personne', id: 'v', nom: 'V' },
            { kind: 'personne', id: 'w', nom: 'W' },
          ],
        },
      ],
      attributions: [{ id: 'at', bienId: 'x', beneficiaireId: 'g', imputation: 'surPart' }],
    });
    const r2 = calculer(s2);
    const recus = ['u', 'v', 'w'].map((id) => lig(r2, id).biensRecus[0].valeurCents);
    expect(recus.reduce((a, b) => a + b, 0n)).toBe(10000000n); // 100 000,00 € pile
    recus.forEach((vCents) => expect(vCents === 3333333n || vCents === 3333334n).toBe(true));
  });

  it('cible un sous-groupe : la valeur ne va qu’à ses membres (hors part)', () => {
    const s3 = succ({
      biens: [{ id: 'x', nom: 'Bijoux', categorie: 'autre', valeurEuros: '60000', quotePart: { n: 1, d: 1 } }],
      beneficiaires: [
        {
          kind: 'groupe', id: 'g', nom: 'G', part: { type: 'reste' },
          membres: [
            { kind: 'personne', id: 'p1', nom: 'P1' },
            { kind: 'sousGroupe', id: 'sg', nom: 'Souche', membres: [
              { kind: 'personne', id: 's1', nom: 'S1' },
              { kind: 'personne', id: 's2', nom: 'S2' },
            ] },
          ],
        },
      ],
      attributions: [{ id: 'at', bienId: 'x', beneficiaireId: 'sg', imputation: 'horsPart' }],
    });
    const r3 = calculer(s3);
    expect(lig(r3, 's1').biensRecus[0].valeurCents).toBe(3000000n);
    expect(lig(r3, 's2').biensRecus[0].valeurCents).toBe(3000000n);
    expect(lig(r3, 's1').biensRecus[0].imputation).toBe('horsPart');
    expect(lig(r3, 'p1').biensRecus.length).toBe(0); // hors du sous-groupe : rien
    expect(r3.horsPartCents).toBe(6000000n); // compté une seule fois (total)
  });

  it('le lien de partage préserve l’attribution au groupe', () => {
    const r = calculer(decoder(encoder(s))!);
    for (const nom of ['A', 'B', 'C']) expect(parNom(r, nom).biensRecus[0]?.valeurCents).toBe(3000000n);
  });

  it('listerCibles propose les groupes en plus des personnes', () => {
    const cibles = listerCibles(s);
    const groupe = cibles.find((c) => c.id === 'g');
    expect(groupe?.groupe).toBe(true);
    expect(cibles.map((c) => c.id)).toEqual(expect.arrayContaining(['g', 'a', 'b', 'c']));
  });
});
