import { describe, it, expect } from 'vitest';
import { pourcentUsufruit, coeffUsufruit, coeffNuePropriete } from './usufruit';

describe('barème usufruit (art. 669 CGI)', () => {
  it('décroît par tranches d’âge', () => {
    expect(pourcentUsufruit(18)).toBe(90);
    expect(pourcentUsufruit(20)).toBe(90);
    expect(pourcentUsufruit(21)).toBe(80);
    expect(pourcentUsufruit(65)).toBe(40);
    expect(pourcentUsufruit(85)).toBe(20);
    expect(pourcentUsufruit(95)).toBe(10);
  });

  it('usufruit + nue-propriété = pleine propriété', () => {
    for (const age of [25, 55, 72, 90, 100]) {
      expect(coeffUsufruit(age).add(coeffNuePropriete(age)).toString()).toBe('1');
    }
    expect(coeffUsufruit(65).toString()).toBe('2/5'); // 40 %
    expect(coeffNuePropriete(65).toString()).toBe('3/5'); // 60 %
  });
});
