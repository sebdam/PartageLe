import { describe, it, expect } from 'vitest';
import { calculerReglements } from './reglements';
import { calculer } from './compute';
import { noteExemple } from './sample';

describe('calculerReglements', () => {
  it('apparie débiteurs et créanciers', () => {
    // Alice créancière 3200 ; Bob doit 1000 ; Chloé doit 2200.
    const r = calculerReglements([
      { nom: 'Alice', soldeCents: -3200n },
      { nom: 'Bob', soldeCents: 1000n },
      { nom: 'Chloé', soldeCents: 2200n },
    ]);
    expect(r).toHaveLength(2);
    expect(r.every((t) => t.versNom === 'Alice')).toBe(true);
    expect(r.reduce((a, t) => a + t.montantCents, 0n)).toBe(3200n);
    expect(r.find((t) => t.deNom === 'Chloé')!.montantCents).toBe(2200n);
    expect(r.find((t) => t.deNom === 'Bob')!.montantCents).toBe(1000n);
  });

  it('depuis le moteur (note de resto)', () => {
    const res = calculer(noteExemple());
    const soldes = res.lignes.filter((l) => !l.estResidu).map((l) => ({ nom: l.nom, soldeCents: -l.soulteCents }));
    const r = calculerReglements(soldes);
    expect(r.reduce((a, t) => a + t.montantCents, 0n)).toBe(3200n); // Alice récupère 32 €
    expect(r.every((t) => t.versNom === 'Alice')).toBe(true);
  });

  it('plusieurs créanciers, au plus n−1 transferts', () => {
    const r = calculerReglements([
      { nom: 'A', soldeCents: 5000n },
      { nom: 'B', soldeCents: 3000n },
      { nom: 'C', soldeCents: -4000n },
      { nom: 'D', soldeCents: -4000n },
    ]);
    expect(r.reduce((a, t) => a + t.montantCents, 0n)).toBe(8000n);
    expect(r.length).toBeLessThanOrEqual(3);
  });
});
