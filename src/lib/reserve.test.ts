import { describe, it, expect } from 'vitest';
import { analyserReserve, type ReserveSlots } from './reserve';
import { calculer } from './compute';
import { successionExemple } from './sample';
import type { Partage } from './model';

const slots = (enfants: bigint[], conjointRecuCents: bigint | null = null): ReserveSlots => ({
  enfants: enfants.map((recuCents, i) => ({ nom: `E${i + 1}`, recuCents })),
  conjointRecuCents,
});

describe('analyserReserve', () => {
  it('réserve globale 3/4 pour 3 enfants et plus', () => {
    const r = analyserReserve(24000000n, 0n, slots([6000000n, 6000000n, 6000000n, 6000000n]));
    expect(r).not.toBeNull();
    expect(r!.reserveGlobale.toString()).toBe('3/4');
    expect(r!.alertes).toHaveLength(0);
  });

  it('réserve 2/3 pour 2 enfants, alerte si un enfant est lésé', () => {
    // base 24M ⇒ réserve 16M, seuil/enfant 8M ; un enfant à 3M < 8M.
    const r = analyserReserve(24000000n, 0n, slots([3000000n, 21000000n]));
    expect(r!.reserveGlobale.toString()).toBe('2/3');
    expect(r!.quotiteDisponibleCents).toBe(8000000n);
    expect(r!.alertes).toHaveLength(1);
    expect(r!.alertes[0]).toContain('E1');
  });

  it('alerte si les attributions hors part dépassent la quotité disponible', () => {
    // 1 enfant ⇒ réserve 1/2 = 12M, QD = 12M ; hors part 15M > 12M.
    const r = analyserReserve(24000000n, 15000000n, slots([9000000n]));
    expect(r!.alertes.some((a) => a.includes('quotité disponible'))).toBe(true);
  });

  it('conjoint seul : réserve 1/4', () => {
    const r = analyserReserve(40000000n, 0n, slots([], 5000000n));
    expect(r!.reserveGlobale.toString()).toBe('1/4');
    expect(r!.alertes).toHaveLength(1); // 5M < réserve 10M
  });

  it('sans réservataire, renvoie null', () => {
    expect(analyserReserve(1000n, 0n, slots([], null))).toBeNull();
  });
});

describe('réserve via le moteur', () => {
  it('exemple maison : 9 enfants, réserve 3/4 respectée', () => {
    const res = calculer(successionExemple());
    expect(res.reserve!.reserveGlobale.toString()).toBe('3/4');
    expect(res.reserve!.nbEnfants).toBe(9);
    expect(res.reserve!.alertes).toHaveLength(0);
  });

  it('une souche compte pour UN seul enfant réservataire', () => {
    // Paul (enfant) + souche Jean[Marie, Luc] ⇒ 2 enfants ⇒ réserve 2/3 (et non 3/4).
    const s: Partage = {
      contexte: 'succession', titre: 'T', devise: 'EUR',
      biens: [{ id: 'b', nom: 'Bien', categorie: 'autre', valeurEuros: '360000', quotePart: { n: 1, d: 1 } }],
      passif: [],
      beneficiaires: [{ kind: 'groupe', id: 'g', nom: 'Les enfants', part: { type: 'reste' }, membres: [
        { kind: 'personne', id: 'paul', nom: 'Paul', lien: 'enfant' },
        { kind: 'sousGroupe', id: 'jean', nom: 'Jean', membres: [
          { kind: 'personne', id: 'marie', nom: 'Marie', lien: 'enfant' },
          { kind: 'personne', id: 'luc', nom: 'Luc', lien: 'enfant' },
        ] },
      ] }],
      attributions: [],
    };
    const res = calculer(s);
    expect(res.reserve!.nbEnfants).toBe(2);
    expect(res.reserve!.reserveGlobale.toString()).toBe('2/3');
    expect(res.reserve!.alertes).toHaveLength(0); // Paul 180k & souche 180k ≥ seuil 120k
  });
});

describe('détail réservataires', () => {
  it('expose reçu, seuil et marge par réservataire', () => {
    const r = analyserReserve(36000000n, 0n, slots([18000000n, 18000000n]))!;
    expect(r.seuilCents).toBe(12000000n); // (2/3 × 36M) / 2
    expect(r.reservataires).toHaveLength(2);
    expect(r.reservataires[0].recuCents).toBe(18000000n);
    expect(r.reservataires[0].margeCents).toBe(6000000n); // +60 000 €
  });

  it('marge négative pour un réservataire lésé', () => {
    const r = analyserReserve(24000000n, 0n, slots([3000000n, 21000000n]))!;
    expect(r.reservataires[0].margeCents).toBeLessThan(0n);
    expect(r.reservataires[1].margeCents).toBeGreaterThan(0n);
  });
});
