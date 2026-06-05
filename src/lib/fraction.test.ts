import { describe, it, expect } from 'vitest';
import { Fraction, sum } from './fraction';

describe('Fraction', () => {
  it('réduit toujours et garde un dénominateur positif', () => {
    expect(Fraction.ratio(2, 4).toString()).toBe('1/2');
    expect(Fraction.ratio(3, -6).toString()).toBe('-1/2');
    expect(Fraction.int(5).toString()).toBe('5');
    expect(Fraction.ratio(0, 7).toString()).toBe('0');
  });

  it('fait des opérations exactes (pas de flottant)', () => {
    // 1/3 + 1/6 = 1/2
    expect(Fraction.ratio(1, 3).add(Fraction.ratio(1, 6)).toString()).toBe('1/2');
    // 1/10 + 2/10 = 3/10 (et surtout pas 0.30000000004)
    expect(Fraction.ratio(1, 10).add(Fraction.ratio(2, 10)).toString()).toBe('3/10');
    expect(Fraction.ratio(3, 4).mul(Fraction.ratio(1, 2)).toString()).toBe('3/8');
    expect(Fraction.one.sub(Fraction.ratio(1, 4)).toString()).toBe('3/4');
  });

  it('parse les saisies humaines en fractions exactes', () => {
    expect(Fraction.parse('180 000,50').toString()).toBe('360001/2');
    expect(Fraction.parse('0,5').toString()).toBe('1/2');
    expect(Fraction.parse('360000').toString()).toBe('360000');
    expect(Fraction.parse('').toString()).toBe('0');
    expect(Fraction.parse('-1,25').toString()).toBe('-5/4');
  });

  it('compare et somme', () => {
    expect(Fraction.ratio(1, 3).cmp(Fraction.ratio(1, 2))).toBe(-1);
    expect(sum([Fraction.ratio(1, 4), Fraction.ratio(3, 4)]).toString()).toBe('1');
  });
});
