import { describe, it, expect } from 'vitest';
import { analyserReserve, type FeuilleReserve } from './reserve';
import { calculer } from './compute';
import { successionExemple } from './sample';

const enf = (nom: string, recuCents: bigint): FeuilleReserve => ({ nom, lien: 'enfant', recuCents });

describe('analyserReserve', () => {
  it('réserve globale 3/4 pour 3 enfants et plus', () => {
    const r = analyserReserve(24000000n, 0n, [enf('A', 6000000n), enf('B', 6000000n), enf('C', 6000000n), enf('D', 6000000n)]);
    expect(r).not.toBeNull();
    expect(r!.reserveGlobale.toString()).toBe('3/4');
    expect(r!.alertes).toHaveLength(0);
  });

  it('réserve 2/3 pour 2 enfants, alerte si un enfant est lésé', () => {
    // base 24M ⇒ réserve 16M, seuil/enfant 8M ; un enfant à 3M < 8M.
    const r = analyserReserve(24000000n, 0n, [enf('Lésé', 3000000n), enf('Gâté', 21000000n)]);
    expect(r!.reserveGlobale.toString()).toBe('2/3');
    expect(r!.quotiteDisponibleCents).toBe(8000000n);
    expect(r!.alertes).toHaveLength(1);
    expect(r!.alertes[0]).toContain('Lésé');
  });

  it('alerte si les attributions hors part dépassent la quotité disponible', () => {
    // 1 enfant ⇒ réserve 1/2 = 12M, QD = 12M ; hors part 15M > 12M.
    const r = analyserReserve(24000000n, 15000000n, [enf('Unique', 9000000n)]);
    expect(r!.alertes.some((a) => a.includes('quotité disponible'))).toBe(true);
  });

  it('conjoint seul : réserve 1/4', () => {
    const r = analyserReserve(40000000n, 0n, [{ nom: 'Veuve', lien: 'conjoint', recuCents: 5000000n }]);
    expect(r!.reserveGlobale.toString()).toBe('1/4');
    expect(r!.alertes).toHaveLength(1); // 5M < réserve 10M
  });

  it('sans réservataire, renvoie null', () => {
    expect(analyserReserve(1000n, 0n, [{ nom: 'Ami', lien: 'autre', recuCents: 1000n }])).toBeNull();
  });
});

describe('réserve sur l’exemple de la maison', () => {
  const res = calculer(successionExemple());
  it('9 enfants : réserve 3/4, respectée', () => {
    expect(res.reserve).not.toBeNull();
    expect(res.reserve!.reserveGlobale.toString()).toBe('3/4');
    expect(res.reserve!.alertes).toHaveLength(0);
  });
});
