import { Fraction, sum } from './fraction';
import { toCents, splitByFractions } from './money';
import { analyserReserve, type ReserveInfo } from './reserve';
import type { Beneficiaire, Lien, Membre, Part, Partage } from './model';

/** Une ligne du résultat (un bénéficiaire, ou le résidu non attribué). */
export interface LigneResultat {
  id: string;
  nom: string;
  estResidu: boolean;
  /** Part du « pot » à partager (fraction exacte). */
  fraction: Fraction;
  /** Pourcentage, pour l'affichage uniquement. */
  pourcent: number;
  /** Montant théorique de la part, en centimes. */
  montantCents: bigint;
  /** Biens reçus en nature. */
  biensRecus: { nom: string; valeurCents: bigint; imputation: 'surPart' | 'horsPart' }[];
  /** Soulte en centimes : > 0 ⇒ la personne verse, < 0 ⇒ elle reçoit. */
  soulteCents: bigint;
}

export interface Resultat {
  titre: string;
  actifCents: bigint;
  passifCents: bigint;
  horsPartCents: bigint;
  /** Masse à partager = actif − passif − attributions hors part. */
  masseCents: bigint;
  lignes: LigneResultat[];
  biens: { id: string; nom: string; valeurEntranteCents: bigint }[];
  avertissements: string[];
  /** Analyse de la réserve héréditaire (succession), ou null. */
  reserve: ReserveInfo | null;
}

interface Feuille {
  id: string;
  nom: string;
  fraction: Fraction;
  lien?: Lien;
}

/** Fraction explicite d'une part, ou null si c'est « le reste ». */
function partExplicite(part: Part): Fraction | null {
  if (part.type === 'fraction') {
    if (part.d === 0) return Fraction.zero;
    return Fraction.ratio(part.n, part.d);
  }
  if (part.type === 'pourcent') {
    return Fraction.parse(part.valeur).div(Fraction.int(100));
  }
  return null; // reste
}

/** Développe un bénéficiaire en feuilles (personnes), les groupes étant répartis à parts égales. */
function developper(node: Beneficiaire, fraction: Fraction, out: Feuille[]): void {
  if (node.kind === 'personne') {
    out.push({ id: node.id, nom: node.nom || 'Sans nom', fraction, lien: node.lien });
    return;
  }
  developperMembres(node.membres, fraction, out);
}

function developperMembres(membres: Membre[], fraction: Fraction, out: Feuille[]): void {
  const k = membres.length;
  if (k === 0) return; // groupe vide : sa part rejoindra le « non attribué »
  const chacun = fraction.div(Fraction.int(k));
  for (const m of membres) {
    if (m.kind === 'personne') out.push({ id: m.id, nom: m.nom || 'Sans nom', fraction: chacun, lien: m.lien });
    else developperMembres(m.membres, chacun, out);
  }
}

function pct(f: Fraction): string {
  const v = Math.round(f.toNumber() * 10000) / 100;
  return `${v.toLocaleString('fr-FR')} %`;
}

/** Cœur du moteur : transforme un partage en résultat (parts + soultes). */
export function calculer(s: Partage): Resultat {
  const avertissements: string[] = [];

  // 1) Biens : valeur entrante = valeur totale × quote-part du défunt, arrondie au centime.
  const biens = s.biens.map((b) => {
    const valeur = Fraction.parse(b.valeurEuros);
    const qp = b.quotePart.d === 0 ? Fraction.zero : Fraction.ratio(b.quotePart.n, b.quotePart.d);
    return { id: b.id, nom: b.nom || 'Bien sans nom', valeurEntranteCents: toCents(valeur.mul(qp)) };
  });
  const bienById = new Map(biens.map((b) => [b.id, b]));
  const actifCents = biens.reduce((a, b) => a + b.valeurEntranteCents, 0n);

  // 2) Passif.
  const passifCents = s.passif.reduce((a, p) => a + toCents(Fraction.parse(p.montantEuros)), 0n);

  // 3) Attributions (en nature).
  let horsPartCents = 0n;
  const surPartParPersonne = new Map<string, bigint>();
  const biensRecus = new Map<string, LigneResultat['biensRecus']>();
  for (const att of s.attributions) {
    const bien = bienById.get(att.bienId);
    if (!bien) continue;
    const liste = biensRecus.get(att.beneficiaireId) ?? [];
    liste.push({ nom: bien.nom, valeurCents: bien.valeurEntranteCents, imputation: att.imputation });
    biensRecus.set(att.beneficiaireId, liste);
    if (att.imputation === 'horsPart') {
      horsPartCents += bien.valeurEntranteCents;
    } else {
      surPartParPersonne.set(att.beneficiaireId, (surPartParPersonne.get(att.beneficiaireId) ?? 0n) + bien.valeurEntranteCents);
    }
  }

  const masseCents = actifCents - passifCents - horsPartCents;
  if (masseCents < 0n) {
    avertissements.push('La masse à partager est négative : le passif et les attributions dépassent l’actif.');
  }

  // 4) Résolution du « reste » au niveau des bénéficiaires de premier rang.
  let sommeExplicite = Fraction.zero;
  let nbReste = 0;
  for (const b of s.beneficiaires) {
    const f = partExplicite(b.part);
    if (f === null) nbReste += 1;
    else sommeExplicite = sommeExplicite.add(f);
  }
  const restant = Fraction.one.sub(sommeExplicite);
  const resteChacun = nbReste > 0 && restant.sign >= 0 ? restant.div(Fraction.int(nbReste)) : Fraction.zero;

  // 5) Développement en feuilles (personnes).
  const feuilles: Feuille[] = [];
  for (const b of s.beneficiaires) {
    const f = partExplicite(b.part) ?? resteChacun;
    developper(b, f, feuilles);
  }
  const sommeFeuilles = sum(feuilles.map((f) => f.fraction));
  const nonAttribue = Fraction.one.sub(sommeFeuilles);

  // Avertissements de cohérence (sur ce qui est réellement attribué aux feuilles).
  if (nonAttribue.sign > 0 && !nonAttribue.isZero) {
    avertissements.push(`Il reste ${pct(nonAttribue)} non attribué.`);
  } else if (nonAttribue.sign < 0) {
    avertissements.push(`Dépassement : les parts totalisent ${pct(sommeFeuilles)} (plus de 100 %).`);
  }

  // Feuille « résidu » pour que Σ = 100 % exactement (garantit un partage au centime près).
  const toutes: Feuille[] = [...feuilles];
  if (!nonAttribue.isZero) {
    toutes.push({
      id: '__residu__',
      nom: nonAttribue.sign < 0 ? 'Dépassement' : 'Non attribué',
      fraction: nonAttribue,
    });
  }

  // 6) Montants (plus forts restes ⇒ somme exacte = masse).
  const fractions = toutes.map((f) => f.fraction);
  const montants = masseCents >= 0n ? splitByFractions(masseCents, fractions) : fractions.map(() => 0n);

  const lignes: LigneResultat[] = toutes.map((f, i) => {
    const estResidu = f.id === '__residu__';
    const montant = montants[i];
    const surPart = surPartParPersonne.get(f.id) ?? 0n;
    return {
      id: f.id,
      nom: f.nom,
      estResidu,
      fraction: f.fraction,
      pourcent: f.fraction.toNumber() * 100,
      montantCents: montant,
      biensRecus: biensRecus.get(f.id) ?? [],
      // Soulte = ce qu'on a reçu en nature (sur part) − sa part théorique.
      soulteCents: estResidu ? 0n : surPart - montant,
    };
  });

  // 7) Réserve héréditaire (succession uniquement, indicative).
  const lienById = new Map(feuilles.map((f) => [f.id, f.lien ?? 'autre'] as const));
  const feuillesReserve = lignes
    .filter((l) => !l.estResidu)
    .map((l) => {
      const horsPartRecu = l.biensRecus.reduce((a, b) => a + (b.imputation === 'horsPart' ? b.valeurCents : 0n), 0n);
      return { nom: l.nom, lien: lienById.get(l.id) ?? 'autre', recuCents: l.montantCents + horsPartRecu };
    });
  const reserve = s.contexte === 'succession' ? analyserReserve(actifCents - passifCents, horsPartCents, feuillesReserve) : null;

  return { titre: s.titre, actifCents, passifCents, horsPartCents, masseCents, lignes, biens, avertissements, reserve };
}
