import { Fraction } from './fraction';

/**
 * L'argent est manipulé en CENTIMES entiers (bigint) pour un affichage exact.
 * On ne convertit en nombre flottant qu'au formatage final.
 */

/** Division entière arrondie au plus proche (demi away-from-zero). d > 0. */
function roundDiv(n: bigint, d: bigint): bigint {
  if (n >= 0n) return (2n * n + d) / (2n * d);
  return -((2n * -n + d) / (2n * d));
}

/** Plus grand entier ≤ fraction (floor, vers −∞). */
function floorFraction(f: Fraction): bigint {
  let q = f.n / f.d; // troncature vers 0
  if (f.n % f.d !== 0n && f.n < 0n) q -= 1n;
  return q;
}

/** Arrondit une fraction d'euros au centime le plus proche. */
export function toCents(euros: Fraction): bigint {
  const cents = euros.mul(Fraction.int(100));
  return roundDiv(cents.n, cents.d);
}

/** Arrondit une fraction au plus proche entier (demi away-from-zero). */
export function arrondi(f: Fraction): bigint {
  return roundDiv(f.n, f.d);
}

/**
 * Répartit `totalCents` selon des parts (dont la somme vaut 1) avec la méthode
 * des plus forts restes : la somme des montants retombe TOUJOURS pile sur le
 * total (au centime près), et les centimes restants vont aux plus gros restes.
 */
export function splitByFractions(totalCents: bigint, parts: Fraction[]): bigint[] {
  const n = parts.length;
  if (n === 0) return [];
  const total = Fraction.int(totalCents);
  const floors: bigint[] = new Array(n);
  const remainders: Fraction[] = new Array(n);
  let allotted = 0n;
  for (let i = 0; i < n; i++) {
    const exact = parts[i].mul(total);
    const fl = floorFraction(exact);
    floors[i] = fl;
    remainders[i] = exact.sub(new Fraction(fl)); // dans [0, 1)
    allotted += fl;
  }
  let leftover = totalCents - allotted; // centimes à redistribuer (0 ≤ leftover < n)
  // Indices triés par reste décroissant, départage par ordre d'apparition (déterministe).
  const order = [...Array(n).keys()].sort((a, b) => {
    const c = remainders[b].cmp(remainders[a]);
    return c !== 0 ? c : a - b;
  });
  const result = floors.slice();
  for (let k = 0; k < order.length && leftover > 0n; k++) {
    result[order[k]] += 1n;
    leftover -= 1n;
  }
  return result;
}

const eurosFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1 234,56 €" à partir d'un montant en centimes. */
export function formatCents(cents: bigint): string {
  return eurosFmt.format(Number(cents) / 100);
}
