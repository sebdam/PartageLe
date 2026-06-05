import { describe, it, expect } from 'vitest';
import { calculer } from './compute';
import { successionExemple } from './sample';
import type { Succession } from './model';

function ligne(res: ReturnType<typeof calculer>, id: string) {
  const l = res.lignes.find((x) => x.id === id);
  if (!l) throw new Error(`ligne ${id} introuvable`);
  return l;
}

describe('calculer — exemple de la maison', () => {
  const res = calculer(successionExemple());

  it('construit la masse à partager', () => {
    expect(res.actifCents).toBe(24000000n); // 180 000 + 24 000 + 36 000
    expect(res.passifCents).toBe(0n);
    expect(res.masseCents).toBe(24000000n);
    expect(res.avertissements).toHaveLength(0);
  });

  it('donne 1/4 à Madame Y et 20 000 € à chaque enfant', () => {
    expect(ligne(res, 'p_y').fraction.toString()).toBe('1/4');
    expect(ligne(res, 'p_y').montantCents).toBe(6000000n);
    expect(ligne(res, 'e_1').fraction.toString()).toBe('1/12'); // 3/4 réparti entre 9
    expect(ligne(res, 'e_1').montantCents).toBe(2000000n);
  });

  it('calcule la soulte de Paul qui reçoit la voiture (sur part)', () => {
    const paul = ligne(res, 'e_0');
    expect(paul.biensRecus.map((b) => b.nom)).toContain('Voiture');
    // reçu en nature 24 000 − part 20 000 = il VERSE 4 000 €
    expect(paul.soulteCents).toBe(400000n);
  });

  it('les montants retombent pile sur la masse', () => {
    const total = res.lignes.reduce((a, l) => a + l.montantCents, 0n);
    expect(total).toBe(res.masseCents);
  });

  it('les soultes se compensent (versées = reçues + trésorerie)', () => {
    const totalSoulte = res.lignes.reduce((a, l) => a + l.soulteCents, 0n);
    // Σ soulte = (sur part en nature) − masse = 2 400 000 − 24 000 000.
    expect(totalSoulte).toBe(-21600000n);
  });
});

describe('calculer — représentation (sous-groupe)', () => {
  const s: Succession = {
    titre: 'Test',
    devise: 'EUR',
    biens: [{ id: 'b', nom: 'Bien', categorie: 'autre', valeurEuros: '24000', quotePart: { n: 1, d: 1 } }],
    passif: [],
    beneficiaires: [
      {
        kind: 'groupe',
        id: 'g',
        nom: 'Enfants',
        part: { type: 'reste' },
        membres: [
          { kind: 'personne', id: 'A', nom: 'A' },
          { kind: 'sousGroupe', id: 'S', nom: 'Souche', membres: [
            { kind: 'personne', id: 'B', nom: 'B' },
            { kind: 'personne', id: 'C', nom: 'C' },
          ] },
        ],
      },
    ],
    attributions: [],
  };
  const res = calculer(s);

  it('A prend 1/2, B et C se partagent l’autre moitié (1/4 chacun)', () => {
    expect(ligne(res, 'A').fraction.toString()).toBe('1/2');
    expect(ligne(res, 'B').fraction.toString()).toBe('1/4');
    expect(ligne(res, 'A').montantCents).toBe(1200000n);
    expect(ligne(res, 'B').montantCents).toBe(600000n);
    expect(ligne(res, 'C').montantCents).toBe(600000n);
  });
});

describe('calculer — garde-fous', () => {
  it('signale un reste non attribué', () => {
    const s: Succession = {
      titre: 'T', devise: 'EUR',
      biens: [{ id: 'b', nom: 'B', categorie: 'autre', valeurEuros: '1000', quotePart: { n: 1, d: 1 } }],
      passif: [],
      beneficiaires: [{ kind: 'personne', id: 'p', nom: 'P', part: { type: 'fraction', n: 1, d: 4 } }],
      attributions: [],
    };
    const res = calculer(s);
    expect(res.avertissements.join(' ')).toContain('non attribué');
    expect(res.lignes.some((l) => l.estResidu)).toBe(true);
  });

  it('signale un dépassement de 100 %', () => {
    const s: Succession = {
      titre: 'T', devise: 'EUR',
      biens: [{ id: 'b', nom: 'B', categorie: 'autre', valeurEuros: '1000', quotePart: { n: 1, d: 1 } }],
      passif: [],
      beneficiaires: [
        { kind: 'personne', id: 'p1', nom: 'P1', part: { type: 'fraction', n: 3, d: 4 } },
        { kind: 'personne', id: 'p2', nom: 'P2', part: { type: 'fraction', n: 1, d: 2 } },
      ],
      attributions: [],
    };
    const res = calculer(s);
    expect(res.avertissements.join(' ')).toContain('Dépassement');
  });
});
