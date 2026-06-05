import { Fraction } from './fraction';
import { arrondi, formatCents } from './money';
import type { Lien } from './model';

/** Une feuille avec son lien et la valeur totale qu'elle reçoit (part + préciput). */
export interface FeuilleReserve {
  nom: string;
  lien: Lien;
  recuCents: bigint;
}

export interface ReserveInfo {
  nbEnfants: number;
  conjoint: boolean;
  baseCents: bigint;
  reserveGlobale: Fraction;
  reserveGlobaleCents: bigint;
  quotiteDisponibleCents: bigint;
  alertes: string[];
}

/**
 * Réserve héréditaire (indicative). Réserve globale selon le nombre d'enfants
 * (1 → 1/2, 2 → 2/3, 3 et + → 3/4) ; à défaut d'enfant, conjoint → 1/4.
 * Renvoie null s'il n'y a pas de réservataire (ou base ≤ 0).
 *
 * NB : la représentation (petits-enfants venant en lieu et place d'un enfant
 * prédécédé) et les libéralités antérieures ne sont pas distinguées — l'alerte
 * reste indicative.
 */
export function analyserReserve(baseCents: bigint, horsPartCents: bigint, feuilles: FeuilleReserve[]): ReserveInfo | null {
  if (baseCents <= 0n) return null;

  const enfants = feuilles.filter((f) => f.lien === 'enfant');
  const nbEnfants = enfants.length;
  const conjoint = feuilles.some((f) => f.lien === 'conjoint');

  let reserveGlobale: Fraction;
  if (nbEnfants >= 1) {
    reserveGlobale = nbEnfants === 1 ? Fraction.ratio(1, 2) : nbEnfants === 2 ? Fraction.ratio(2, 3) : Fraction.ratio(3, 4);
  } else if (conjoint) {
    reserveGlobale = Fraction.ratio(1, 4);
  } else {
    return null; // aucun héritier réservataire
  }

  const reserveGlobaleCents = arrondi(reserveGlobale.mul(Fraction.int(baseCents)));
  const quotiteDisponibleCents = baseCents - reserveGlobaleCents;
  const alertes: string[] = [];

  if (nbEnfants >= 1) {
    const seuil = reserveGlobaleCents / BigInt(nbEnfants); // réserve individuelle par enfant
    for (const e of enfants) {
      if (e.recuCents < seuil) {
        alertes.push(`${e.nom || 'Un enfant'} reçoit ${formatCents(e.recuCents)}, en dessous de sa réserve (≈ ${formatCents(seuil)}).`);
      }
    }
  } else {
    const c = feuilles.find((f) => f.lien === 'conjoint');
    if (c && c.recuCents < reserveGlobaleCents) {
      alertes.push(`Le conjoint reçoit ${formatCents(c.recuCents)}, en dessous de sa réserve (${formatCents(reserveGlobaleCents)}).`);
    }
  }

  if (horsPartCents > quotiteDisponibleCents) {
    alertes.push(`Les attributions hors part (${formatCents(horsPartCents)}) dépassent la quotité disponible (${formatCents(quotiteDisponibleCents)}).`);
  }

  return { nbEnfants, conjoint, baseCents, reserveGlobale, reserveGlobaleCents, quotiteDisponibleCents, alertes };
}
