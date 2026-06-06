import { Fraction } from './fraction';

/**
 * Barème fiscal de l'usufruit — usufruit viager (art. 669, I du CGI).
 * La valeur de l'usufruit décroît avec l'âge de l'usufruitier ; la nue-propriété
 * est le complément (usufruit + nue-propriété = pleine propriété).
 */
const BAREME: { maxAge: number; usufruit: number }[] = [
  { maxAge: 20, usufruit: 90 },
  { maxAge: 30, usufruit: 80 },
  { maxAge: 40, usufruit: 70 },
  { maxAge: 50, usufruit: 60 },
  { maxAge: 60, usufruit: 50 },
  { maxAge: 70, usufruit: 40 },
  { maxAge: 80, usufruit: 30 },
  { maxAge: 90, usufruit: 20 },
  { maxAge: Infinity, usufruit: 10 },
];

/** Pourcentage d'usufruit (0–100) pour un âge donné. */
export function pourcentUsufruit(age: number): number {
  const a = Number.isFinite(age) ? Math.max(0, Math.floor(age)) : 0;
  return (BAREME.find((b) => a <= b.maxAge) ?? BAREME[BAREME.length - 1]).usufruit;
}

/** Coefficient (fraction de la pleine propriété) de l'usufruit, selon l'âge de l'usufruitier. */
export function coeffUsufruit(age: number): Fraction {
  return Fraction.ratio(pourcentUsufruit(age), 100);
}

/** Coefficient de la nue-propriété (complément de l'usufruit). */
export function coeffNuePropriete(age: number): Fraction {
  return Fraction.one.sub(coeffUsufruit(age));
}
