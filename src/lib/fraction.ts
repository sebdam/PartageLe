/**
 * Arithmétique rationnelle EXACTE (fractions d'entiers, en bigint).
 *
 * Une app « sur les fractions » ne doit jamais afficher 0.30000004 : tout le
 * calcul reste donc en numérateur / dénominateur entiers, et on n'arrondit
 * qu'au tout dernier moment, pour l'affichage (cf. money.ts).
 */

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export class Fraction {
  /** Numérateur (porte le signe). */
  readonly n: bigint;
  /** Dénominateur, toujours strictement positif. */
  readonly d: bigint;

  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new Error('Fraction : dénominateur nul');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }

  static readonly zero = new Fraction(0n);
  static readonly one = new Fraction(1n);

  static int(value: number | bigint): Fraction {
    return new Fraction(BigInt(value));
  }

  static ratio(n: number | bigint, d: number | bigint): Fraction {
    return new Fraction(BigInt(n), BigInt(d));
  }

  /**
   * Parse une saisie décimale humaine en fraction EXACTE.
   * Tolère les espaces (séparateurs de milliers) et la virgule décimale.
   * Ex. "180 000,50" -> 360001/2 ; "" -> 0.
   */
  static parse(input: string): Fraction {
    const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
    if (cleaned === '' || cleaned === '-' || cleaned === '+') return Fraction.zero;
    const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(cleaned);
    if (!m) return Fraction.zero; // saisie incomplète/invalide : on n'interrompt pas la frappe
    const sign = m[1] === '-' ? -1n : 1n;
    const intPart = m[2] || '0';
    const fracPart = m[3] || '';
    const num = sign * BigInt(intPart + fracPart);
    const den = 10n ** BigInt(fracPart.length);
    return new Fraction(num, den);
  }

  add(o: Fraction): Fraction {
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Fraction): Fraction {
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Fraction): Fraction {
    return new Fraction(this.n * o.n, this.d * o.d);
  }
  div(o: Fraction): Fraction {
    if (o.n === 0n) throw new Error('Fraction : division par zéro');
    return new Fraction(this.n * o.d, this.d * o.n);
  }
  neg(): Fraction {
    return new Fraction(-this.n, this.d);
  }

  /** -1, 0 ou 1 selon le signe de (this − o). */
  cmp(o: Fraction): number {
    const left = this.n * o.d;
    const right = o.n * this.d;
    return left < right ? -1 : left > right ? 1 : 0;
  }
  equals(o: Fraction): boolean {
    return this.n === o.n && this.d === o.d;
  }
  get isZero(): boolean {
    return this.n === 0n;
  }
  /** -1, 0 ou 1. */
  get sign(): number {
    return this.n < 0n ? -1 : this.n > 0n ? 1 : 0;
  }

  /** Valeur flottante — UNIQUEMENT pour l'affichage, jamais pour le calcul. */
  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }

  /** "1/2", "3", "-2/3". */
  toString(): string {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }
}

export function sum(fractions: Fraction[]): Fraction {
  return fractions.reduce((acc, f) => acc.add(f), Fraction.zero);
}
