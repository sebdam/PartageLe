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
    expect(lig(res, 'e1').demembrement).toBe('nue-propriété');
    expect(res.lignes.reduce((a, l) => a + l.montantCents, 0n)).toBe(10000000n);
  });

  it('le lien préserve l’option du conjoint', () => {
    expect(decoder(encoder(s))!.usufruitConjoint).toBe(75);
  });
});

describe('conjoint avec descendant : 1/4 en pleine propriété par défaut', () => {
  // Part saisie « le reste » sur le conjoint : ignorée, il a 1/4 en PP (art. 757).
  const s = succ({
    biens: [{ id: 'b', nom: 'Patrimoine', categorie: 'autre', valeurEuros: '100000', quotePart: { n: 1, d: 1 } }],
    beneficiaires: [
      { kind: 'personne', id: 'c', nom: 'Conjoint', part: { type: 'reste' }, lien: 'conjoint' },
      { kind: 'groupe', id: 'g', nom: 'Enfants', part: { type: 'reste' }, membres: [
        { kind: 'personne', id: 'e1', nom: 'E1', lien: 'enfant' },
        { kind: 'personne', id: 'e2', nom: 'E2', lien: 'enfant' },
      ] },
    ],
  });

  it('le conjoint reçoit 1/4 en PP, les enfants le reste (3/4)', () => {
    const r = calculer(s);
    expect(lig(r, 'c').montantCents).toBe(2500000n); // 1/4 de 100 000
    expect(lig(r, 'c').demembrement).toBeUndefined(); // pleine propriété
    expect(lig(r, 'e1').montantCents).toBe(3750000n); // 3/8 chacun
    expect(lig(r, 'e2').montantCents).toBe(3750000n);
    expect(r.lignes.reduce((a, l) => a + l.montantCents, 0n)).toBe(10000000n);
  });
});

describe('donation au dernier vivant (art. 1094-1)', () => {
  const avec = (over: Partial<Partage>) => succ({
    biens: [{ id: 'b', nom: 'Patrimoine', categorie: 'autre', valeurEuros: '100000', quotePart: { n: 1, d: 1 } }],
    beneficiaires: [
      { kind: 'personne', id: 'c', nom: 'Conjoint', part: { type: 'fraction', n: 1, d: 4 }, lien: 'conjoint' },
      { kind: 'personne', id: 'e', nom: 'Enfant', part: { type: 'reste' }, lien: 'enfant' },
    ],
    ...over,
  });

  it('quotité disponible en PP : 1/2 avec un seul enfant', () => {
    const r = calculer(avec({ optionConjoint: 'qdPP' }));
    expect(lig(r, 'c').montantCents).toBe(5000000n); // 1/2
    expect(lig(r, 'c').demembrement).toBeUndefined(); // pleine propriété
    expect(lig(r, 'e').montantCents).toBe(5000000n);
  });

  it('1/4 PP + 3/4 usufruit (conjoint 75 ans → usufruit 30 %)', () => {
    const r = calculer(avec({ optionConjoint: 'quartUsufruit', usufruitConjoint: 75 }));
    expect(lig(r, 'c').montantCents).toBe(4750000n); // 1/4 + 3/4 × 30 % = 0,475
    expect(lig(r, 'c').demembrement).toBe('¼ PP + ¾ usufruit');
    expect(lig(r, 'e').montantCents).toBe(5250000n); // 0,525 en nue-propriété
    expect(lig(r, 'e').demembrement).toBe('nue-propriété');
    expect(r.lignes.reduce((a, l) => a + l.montantCents, 0n)).toBe(10000000n);
  });

  it('quotité disponible en PP : 1/3 avec deux enfants', () => {
    const s2 = succ({
      biens: [{ id: 'b', nom: 'P', categorie: 'autre', valeurEuros: '90000', quotePart: { n: 1, d: 1 } }],
      beneficiaires: [
        { kind: 'personne', id: 'c', nom: 'C', part: { type: 'reste' }, lien: 'conjoint' },
        { kind: 'groupe', id: 'g', nom: 'Enf', part: { type: 'reste' }, membres: [
          { kind: 'personne', id: 'e1', nom: 'E1', lien: 'enfant' },
          { kind: 'personne', id: 'e2', nom: 'E2', lien: 'enfant' },
        ] },
      ],
      optionConjoint: 'qdPP',
    });
    const r = calculer(s2);
    expect(lig(r, 'c').montantCents).toBe(3000000n); // 1/3 de 90 000
    expect(lig(r, 'e1').montantCents).toBe(3000000n); // 2/3 ÷ 2
    expect(lig(r, 'e2').montantCents).toBe(3000000n);
  });

  it('le lien préserve l’option et l’âge', () => {
    const d = decoder(encoder(avec({ optionConjoint: 'quartUsufruit', usufruitConjoint: 75 })))!;
    expect(d.optionConjoint).toBe('quartUsufruit');
    expect(d.usufruitConjoint).toBe(75);
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
