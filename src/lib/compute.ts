import { Fraction, sum } from './fraction';
import { toCents, splitByFractions, arrondi } from './money';
import { analyserReserve, type ReserveInfo, type ReserveSlots } from './reserve';
import { coeffUsufruit, coeffNuePropriete } from './usufruit';
import type { Beneficiaire, Droit, Lien, Membre, Part, Partage } from './model';

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
  /** Biens reçus en nature (avec le droit transmis). */
  biensRecus: { nom: string; valeurCents: bigint; imputation: 'surPart' | 'horsPart'; droit: Droit }[];
  /** Soulte en centimes : > 0 ⇒ la personne verse, < 0 ⇒ elle reçoit. */
  soulteCents: bigint;
  /** Si la personne vient par représentation : « qui » elle représente (chaîne de souches). */
  representeDe?: string;
  /** Démembrement (option du conjoint) : 'usufruit' ou 'nue' propriété. */
  demembrement?: 'usufruit' | 'nue';
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
  /** Chaîne des souches (sous-groupes) dont la personne descend, du haut vers le bas. */
  souches?: string[];
  demembrement?: 'usufruit' | 'nue';
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
function developper(node: Beneficiaire, fraction: Fraction, out: Feuille[], dem?: 'usufruit' | 'nue'): void {
  if (node.kind === 'personne') {
    out.push({ id: node.id, nom: node.nom || 'Sans nom', fraction, lien: node.lien, demembrement: dem });
    return;
  }
  developperMembres(node.membres, fraction, out, [], dem);
}

function developperMembres(membres: Membre[], fraction: Fraction, out: Feuille[], souches: string[], dem?: 'usufruit' | 'nue'): void {
  const k = membres.length;
  if (k === 0) return; // groupe vide : sa part rejoindra le « non attribué »
  const chacun = fraction.div(Fraction.int(k));
  for (const m of membres) {
    if (m.kind === 'personne') out.push({ id: m.id, nom: m.nom || 'Sans nom', fraction: chacun, lien: m.lien, souches, demembrement: dem });
    else developperMembres(m.membres, chacun, out, [...souches, m.nom || 'Souche'], dem);
  }
}

function pct(f: Fraction): string {
  const v = Math.round(f.toNumber() * 10000) / 100;
  return `${v.toLocaleString('fr-FR')} %`;
}

/**
 * Construit les « slots » réservataires : un enfant, ou une souche (qui représente
 * un enfant prédécédé) compte pour UN seul enfant, sa réserve étant appréciée
 * collectivement (somme reçue par ses membres).
 */
function construireSlots(beneficiaires: Beneficiaire[], recuById: Map<string, bigint>): ReserveSlots {
  const enfants: { nom: string; recuCents: bigint }[] = [];
  let conjointRecuCents: bigint | null = null;

  const recu = (id: string) => recuById.get(id) ?? 0n;
  const contientEnfant = (m: Membre): boolean =>
    m.kind === 'personne' ? m.lien === 'enfant' : m.membres.some(contientEnfant);
  const sommeRecu = (m: Membre): bigint =>
    m.kind === 'personne' ? recu(m.id) : m.membres.reduce((a, x) => a + sommeRecu(x), 0n);

  const visiterMembre = (m: Membre) => {
    if (m.kind === 'personne') {
      if (m.lien === 'enfant') enfants.push({ nom: m.nom || 'Enfant', recuCents: recu(m.id) });
      else if (m.lien === 'conjoint') conjointRecuCents = (conjointRecuCents ?? 0n) + recu(m.id);
    } else if (contientEnfant(m)) {
      enfants.push({ nom: m.nom || 'Souche', recuCents: sommeRecu(m) }); // souche = un seul enfant réservataire
    } else {
      m.membres.forEach(visiterMembre);
    }
  };

  for (const b of beneficiaires) {
    if (b.kind === 'personne') {
      if (b.lien === 'enfant') enfants.push({ nom: b.nom || 'Enfant', recuCents: recu(b.id) });
      else if (b.lien === 'conjoint') conjointRecuCents = (conjointRecuCents ?? 0n) + recu(b.id);
    } else {
      b.membres.forEach(visiterMembre);
    }
  }
  return { enfants, conjointRecuCents };
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

  // 3) Attributions (en nature, éventuellement démembrées : fraction du bien × droit).
  let horsPartCents = 0n;
  const surPartParPersonne = new Map<string, bigint>();
  const biensRecus = new Map<string, LigneResultat['biensRecus']>();
  const repartiParBien = new Map<string, Fraction>();
  for (const att of s.attributions) {
    const bien = bienById.get(att.bienId);
    if (!bien) continue;
    const droit: Droit = att.droit ?? 'pleine';
    const fr = att.fraction ?? { n: 1, d: 1 };
    const fracBien = fr.d === 0 ? Fraction.zero : Fraction.ratio(fr.n, fr.d);
    const coeff =
      droit === 'usufruit'
        ? coeffUsufruit(att.ageUsufruitier ?? 0)
        : droit === 'nue'
          ? coeffNuePropriete(att.ageUsufruitier ?? 0)
          : Fraction.one;
    const partValeur = fracBien.mul(coeff); // fraction de la valeur du bien revenant ici
    const valeurCents = arrondi(Fraction.int(bien.valeurEntranteCents).mul(partValeur));
    repartiParBien.set(att.bienId, (repartiParBien.get(att.bienId) ?? Fraction.zero).add(partValeur));

    const liste = biensRecus.get(att.beneficiaireId) ?? [];
    liste.push({ nom: bien.nom, valeurCents, imputation: att.imputation, droit });
    biensRecus.set(att.beneficiaireId, liste);
    if (att.imputation === 'horsPart') horsPartCents += valeurCents;
    else surPartParPersonne.set(att.beneficiaireId, (surPartParPersonne.get(att.beneficiaireId) ?? 0n) + valeurCents);
  }
  // Garde-fou : un bien attribué doit l'être en totalité (en valeur).
  for (const [bienId, frac] of repartiParBien) {
    const c = frac.cmp(Fraction.one);
    const nomBien = bienById.get(bienId)?.nom ?? 'Un bien';
    if (c < 0) avertissements.push(`${nomBien} n'est réparti qu'à ${pct(frac)} (part non attribuée).`);
    else if (c > 0) avertissements.push(`${nomBien} est attribué à ${pct(frac)} (plus de 100 %).`);
  }

  const masseCents = actifCents - passifCents - horsPartCents;
  if (masseCents < 0n) {
    avertissements.push('La masse à partager est négative : le passif et les attributions dépassent l’actif.');
  }

  // 4) Option du conjoint : s'il prend 100 % en usufruit, il reçoit U % de la masse,
  //    les autres se partagent la nue-propriété (1 − U %) au prorata de leurs parts.
  const estConjoint = (b: Beneficiaire) => b.kind === 'personne' && b.lien === 'conjoint';
  const optionConjoint =
    s.contexte === 'succession' && s.usufruitConjoint != null && s.beneficiaires.some(estConjoint);
  const uCoeff = optionConjoint ? coeffUsufruit(s.usufruitConjoint as number) : Fraction.zero;
  const partNue = Fraction.one.sub(uCoeff);

  // Résolution du « reste » (le conjoint en usufruit est traité à part).
  let sommeExplicite = Fraction.zero;
  let nbReste = 0;
  for (const b of s.beneficiaires) {
    if (optionConjoint && estConjoint(b)) continue;
    const f = partExplicite(b.part);
    if (f === null) nbReste += 1;
    else sommeExplicite = sommeExplicite.add(f);
  }
  const restant = Fraction.one.sub(sommeExplicite);
  const resteChacun = nbReste > 0 && restant.sign >= 0 ? restant.div(Fraction.int(nbReste)) : Fraction.zero;

  // 5) Développement en feuilles (personnes).
  const feuilles: Feuille[] = [];
  for (const b of s.beneficiaires) {
    if (optionConjoint && b.kind === 'personne' && b.lien === 'conjoint') {
      feuilles.push({ id: b.id, nom: b.nom || 'Conjoint', fraction: uCoeff, lien: b.lien, demembrement: 'usufruit' });
      continue;
    }
    const f = (partExplicite(b.part) ?? resteChacun).mul(optionConjoint ? partNue : Fraction.one);
    developper(b, f, feuilles, optionConjoint ? 'nue' : undefined);
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
      representeDe: f.souches && f.souches.length > 0 ? f.souches.join(' › ') : undefined,
      demembrement: f.demembrement,
    };
  });

  // 7) Réserve héréditaire (succession uniquement, indicative).
  const recuById = new Map<string, bigint>();
  for (const l of lignes) {
    if (l.estResidu) continue;
    const horsPartRecu = l.biensRecus.reduce((a, b) => a + (b.imputation === 'horsPart' ? b.valeurCents : 0n), 0n);
    recuById.set(l.id, l.montantCents + horsPartRecu);
  }
  const reserve =
    s.contexte === 'succession'
      ? analyserReserve(actifCents - passifCents, horsPartCents, construireSlots(s.beneficiaires, recuById))
      : null;

  return { titre: s.titre, actifCents, passifCents, horsPartCents, masseCents, lignes, biens, avertissements, reserve };
}
