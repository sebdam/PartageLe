import { Fraction } from './fraction';
import { arrondi, formatCents } from './money';

/** Slots réservataires : un enfant, ou une souche (qui représente un enfant décédé) compte pour UN. */
export interface ReserveSlots {
  enfants: { nom: string; recuCents: bigint }[];
  /** Valeur reçue par le conjoint, ou null s'il n'y en a pas. */
  conjointRecuCents: bigint | null;
}

/** Détail d'un réservataire : ce qu'il reçoit, son seuil (réserve individuelle) et la marge. */
export interface ReservataireDetail {
  nom: string;
  type: 'enfant' | 'conjoint';
  recuCents: bigint;
  seuilCents: bigint;
  /** Reçu − seuil (négatif ⇒ réservataire lésé). */
  margeCents: bigint;
}

export interface ReserveInfo {
  nbEnfants: number;
  conjoint: boolean;
  baseCents: bigint;
  reserveGlobale: Fraction;
  reserveGlobaleCents: bigint;
  quotiteDisponibleCents: bigint;
  /** Réserve individuelle (par enfant / souche, ou par conjoint). */
  seuilCents: bigint;
  reservataires: ReservataireDetail[];
  alertes: string[];
}

/**
 * Réserve héréditaire (indicative). Réserve globale selon le nombre d'enfants
 * (1 → 1/2, 2 → 2/3, 3 et + → 3/4) ; à défaut d'enfant, conjoint → 1/4.
 *
 * Une souche (représentation d'un enfant prédécédé) compte pour UN enfant, et sa
 * réserve est appréciée collectivement (somme reçue par ses membres). Les
 * libéralités antérieures (rapport) ne sont pas prises en compte.
 */
export function analyserReserve(baseCents: bigint, horsPartCents: bigint, slots: ReserveSlots): ReserveInfo | null {
  if (baseCents <= 0n) return null;

  const nbEnfants = slots.enfants.length;
  const conjoint = slots.conjointRecuCents !== null;

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
  const reservataires: ReservataireDetail[] = [];
  let seuilCents: bigint;

  if (nbEnfants >= 1) {
    seuilCents = reserveGlobaleCents / BigInt(nbEnfants); // réserve individuelle par enfant / souche
    for (const e of slots.enfants) {
      const margeCents = e.recuCents - seuilCents;
      reservataires.push({ nom: e.nom || 'Enfant', type: 'enfant', recuCents: e.recuCents, seuilCents, margeCents });
      if (margeCents < 0n) {
        alertes.push(`${e.nom || 'Un enfant'} reçoit ${formatCents(e.recuCents)}, en dessous de sa réserve (≈ ${formatCents(seuilCents)}).`);
      }
    }
  } else {
    // conjoint réservataire (garanti non null car la réserve globale a été assignée)
    seuilCents = reserveGlobaleCents;
    const recuCents = slots.conjointRecuCents ?? 0n;
    const margeCents = recuCents - seuilCents;
    reservataires.push({ nom: 'Conjoint', type: 'conjoint', recuCents, seuilCents, margeCents });
    if (margeCents < 0n) {
      alertes.push(`Le conjoint reçoit ${formatCents(recuCents)}, en dessous de sa réserve (${formatCents(seuilCents)}).`);
    }
  }

  if (horsPartCents > quotiteDisponibleCents) {
    alertes.push(`Les attributions hors part (${formatCents(horsPartCents)}) dépassent la quotité disponible (${formatCents(quotiteDisponibleCents)}).`);
  }

  return {
    nbEnfants,
    conjoint,
    baseCents,
    reserveGlobale,
    reserveGlobaleCents,
    quotiteDisponibleCents,
    seuilCents,
    reservataires,
    alertes,
  };
}
