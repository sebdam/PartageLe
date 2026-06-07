import { describe, it, expect } from 'vitest';
import { calculer } from './compute';
import { encoder, decoder } from './urlState';
import type { Partage } from './model';

function succ(over: Partial<Partage>): Partage {
  return { contexte: 'succession', titre: 'T', devise: 'EUR', biens: [], passif: [], beneficiaires: [], attributions: [], ...over };
}
const lig = (res: ReturnType<typeof calculer>, id: string) => res.lignes.find((l) => l.id === id)!;

describe('attribution démembrée', () => {
  // Maison 300 000 € : X (65 ans) prend l'usufruit, Y la nue-propriété.
  const s = succ({
    biens: [{ id: 'b', nom: 'Maison', categorie: 'immobilier', valeurEuros: '300000', quotePart: { n: 1, d: 1 } }],
    beneficiaires: [
      { kind: 'personne', id: 'x', nom: 'X', part: { type: 'fraction', n: 1, d: 2 } },
      { kind: 'personne', id: 'y', nom: 'Y', part: { type: 'fraction', n: 1, d: 2 } },
    ],
    attributions: [
      { id: 'a1', bienId: 'b', beneficiaireId: 'x', imputation: 'surPart', droit: 'usufruit', fraction: { n: 1, d: 1 }, ageUsufruitier: 65 },
      { id: 'a2', bienId: 'b', beneficiaireId: 'y', imputation: 'surPart', droit: 'nue', fraction: { n: 1, d: 1 }, ageUsufruitier: 65 },
    ],
  });
  const res = calculer(s);

  it('usufruit 65 ans = 40 %, nue-propriété = 60 % (somme = valeur du bien)', () => {
    expect(lig(res, 'x').biensRecus[0].valeurCents).toBe(12000000n);
    expect(lig(res, 'y').biensRecus[0].valeurCents).toBe(18000000n);
    expect(res.avertissements.join(' ')).not.toContain('réparti');
  });

  it('avertit si un bien n’est pas entièrement réparti', () => {
    const partiel = succ({
      biens: [{ id: 'b', nom: 'Maison', categorie: 'immobilier', valeurEuros: '300000', quotePart: { n: 1, d: 1 } }],
      beneficiaires: [{ kind: 'personne', id: 'x', nom: 'X', part: { type: 'reste' } }],
      attributions: [{ id: 'a1', bienId: 'b', beneficiaireId: 'x', imputation: 'surPart', droit: 'usufruit', fraction: { n: 1, d: 1 }, ageUsufruitier: 65 }],
    });
    expect(calculer(partiel).avertissements.join(' ')).toContain('réparti');
  });

  it('le lien préserve le démembrement', () => {
    const d = decoder(encoder(s))!;
    const r2 = calculer(d);
    expect(r2.lignes.map((l) => l.biensRecus.map((b) => [b.droit, b.valeurCents]))).toEqual(
      res.lignes.map((l) => l.biensRecus.map((b) => [b.droit, b.valeurCents])),
    );
  });
});

describe('option du conjoint (100 % usufruit)', () => {
  // Conjoint 75 ans → usufruit 30 % ; 2 enfants se partagent la nue-propriété (70 %). Masse 100 000.
  const s = succ({
    biens: [{ id: 'b', nom: 'Patrimoine', categorie: 'autre', valeurEuros: '100000', quotePart: { n: 1, d: 1 } }],
    beneficiaires: [
      { kind: 'personne', id: 'c', nom: 'Conjoint', part: { type: 'fraction', n: 1, d: 4 }, lien: 'conjoint' },
      { kind: 'groupe', id: 'g', nom: 'Enfants', part: { type: 'reste' }, membres: [
        { kind: 'personne', id: 'e1', nom: 'E1', lien: 'enfant' },
        { kind: 'personne', id: 'e2', nom: 'E2', lien: 'enfant' },
      ] },
    ],
    usufruitConjoint: 75,
  });
  const res = calculer(s);

  it('conjoint = usufruit 30 %, enfants la nue-propriété (35 % chacun)', () => {
    expect(lig(res, 'c').montantCents).toBe(3000000n);
    expect(lig(res, 'c').demembrement).toBe('usufruit');
    expect(lig(res, 'e1').montantCents).toBe(3500000n);
    expect(lig(res, 'e2').montantCents).toBe(3500000n);
    expect(lig(res, 'e1').demembrement).toBe('nue');
    expect(res.lignes.reduce((a, l) => a + l.montantCents, 0n)).toBe(10000000n);
  });

  it('le lien préserve l’option du conjoint', () => {
    expect(decoder(encoder(s))!.usufruitConjoint).toBe(75);
  });
});

describe('démembrement réservé à l’immobilier', () => {
  const base = (categorie: 'immobilier' | 'compte') => succ({
    biens: [{ id: 'b', nom: 'Bien', categorie, valeurEuros: '100000', quotePart: { n: 1, d: 1 } }],
    beneficiaires: [{ kind: 'personne', id: 'x', nom: 'X', part: { type: 'reste' } }],
    attributions: [{ id: 'a', bienId: 'b', beneficiaireId: 'x', imputation: 'surPart', droit: 'usufruit', fraction: { n: 1, d: 1 }, ageUsufruitier: 65 }],
  });

  it('un bien non immobilier en « usufruit » est compté en pleine propriété', () => {
    const r = calculer(base('compte'));
    expect(r.lignes[0].biensRecus[0].valeurCents).toBe(10000000n); // pleine valeur, pas 40 %
    expect(r.lignes[0].biensRecus[0].droit).toBe('pleine');
    expect(r.avertissements.join(' ')).not.toContain('réparti'); // réparti à 100 %
  });

  it('un bien immobilier en usufruit reste démembré (barème 669)', () => {
    const r = calculer(base('immobilier'));
    expect(r.lignes[0].biensRecus[0].valeurCents).toBe(4000000n); // 40 % à 65 ans
    expect(r.lignes[0].biensRecus[0].droit).toBe('usufruit');
  });
});
