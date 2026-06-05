import { describe, it, expect } from 'vitest';
import { Fraction } from './fraction';
import { toCents, splitByFractions, formatCents } from './money';

describe('toCents', () => {
  it('convertit en centimes en arrondissant au plus proche', () => {
    expect(toCents(Fraction.parse('360000').mul(Fraction.ratio(1, 2)))).toBe(18000000n); // ½ maison = 180 000 €
    expect(toCents(Fraction.parse('1234.56'))).toBe(123456n);
    expect(toCents(Fraction.parse('0.005'))).toBe(1n); // demi-centime arrondi vers le haut
    expect(toCents(Fraction.parse('0.004'))).toBe(0n);
  });
});

describe('splitByFractions', () => {
  it('répartit sans perdre ni créer de centime (plus forts restes)', () => {
    const tiers = [Fraction.ratio(1, 3), Fraction.ratio(1, 3), Fraction.ratio(1, 3)];
    const parts = splitByFractions(10000n, tiers); // 100,00 € en trois
    expect(parts).toEqual([3334n, 3333n, 3333n]);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(10000n);
  });

  it('retombe pile sur le total quel que soit le découpage', () => {
    const parts = splitByFractions(100n, [Fraction.ratio(1, 7), Fraction.ratio(6, 7)]);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(100n);
  });
});

describe('formatCents', () => {
  it('formate en euros', () => {
    expect(formatCents(123456n)).toContain('1');
    expect(formatCents(123456n)).toContain('€');
  });
});
