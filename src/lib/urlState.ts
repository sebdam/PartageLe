import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { CATEGORIES } from './model';
import type { Attribution, Beneficiaire, Bien, Categorie, Lien, Membre, Part, Partage } from './model';

/**
 * Partage par lien (zéro backend). L'état est sérialisé en TUPLES compacts (pas de
 * noms de clés ; catégories / liens / types de part en petits entiers ; ids
 * raccourcis ; devise et défauts omis), puis compressé (lz-string) et placé dans
 * le hash de l'URL → liens nettement plus courts (compatibles SMS).
 * Les anciens liens #p=<base64 JSON> restent lisibles.
 */

const VERSION = 1;
const CATS = CATEGORIES.map((c) => c.value); // index ↔ catégorie
const LIENS: Lien[] = ['enfant', 'conjoint', 'autre'];

// --- Identifiants courts -----------------------------------------------------

/** Réécrit tous les identifiants en versions courtes (et remappe les références). */
function compacter(p: Partage): Partage {
  let n = 0;
  const map = new Map<string, string>();
  const remap = (old: string): string => {
    let v = map.get(old);
    if (v === undefined) {
      v = (n++).toString(36);
      map.set(old, v);
    }
    return v;
  };
  const visitMembre = (m: Membre): Membre =>
    m.kind === 'personne' ? { ...m, id: remap(m.id) } : { ...m, id: remap(m.id), membres: m.membres.map(visitMembre) };
  const beneficiaires: Beneficiaire[] = p.beneficiaires.map((b) =>
    b.kind === 'personne' ? { ...b, id: remap(b.id) } : { ...b, id: remap(b.id), membres: b.membres.map(visitMembre) },
  );
  const biens = p.biens.map((b) => ({ ...b, id: remap(b.id) }));
  const passif = p.passif.map((x) => ({ ...x, id: remap(x.id) }));
  const attributions = p.attributions.map((a) => ({
    ...a,
    id: remap(a.id),
    bienId: map.get(a.bienId) ?? a.bienId,
    beneficiaireId: map.get(a.beneficiaireId) ?? a.beneficiaireId,
  }));
  return { ...p, biens, passif, beneficiaires, attributions };
}

// --- Codec tuples ↔ Partage --------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function partVers(p: Part): unknown[] {
  if (p.type === 'fraction') return [0, p.n, p.d];
  if (p.type === 'pourcent') return [1, p.valeur];
  return [2];
}
function partDe(a: any): Part {
  if (a[0] === 0) return { type: 'fraction', n: a[1], d: a[2] };
  if (a[0] === 1) return { type: 'pourcent', valeur: a[1] };
  return { type: 'reste' };
}
const lienVers = (l: Lien | undefined): number => Math.max(0, LIENS.indexOf(l ?? 'autre'));
const lienDe = (c: number): Lien => LIENS[c] ?? 'autre';

function bienVers(b: Bien): unknown[] {
  return [b.id, b.nom, b.valeurEuros, b.quotePart.n, b.quotePart.d, Math.max(0, CATS.indexOf(b.categorie))];
}
function bienDe(a: any): Bien {
  return { id: a[0], nom: a[1], categorie: (CATS[a[5]] ?? 'autre') as Categorie, valeurEuros: a[2], quotePart: { n: a[3], d: a[4] } };
}
function membreVers(m: Membre): unknown[] {
  return m.kind === 'personne' ? [0, m.id, m.nom, lienVers(m.lien)] : [1, m.id, m.nom, m.membres.map(membreVers)];
}
function membreDe(a: any): Membre {
  return a[0] === 0
    ? { kind: 'personne', id: a[1], nom: a[2], lien: lienDe(a[3]) }
    : { kind: 'sousGroupe', id: a[1], nom: a[2], membres: (a[3] ?? []).map(membreDe) };
}
function benefVers(b: Beneficiaire): unknown[] {
  return b.kind === 'personne'
    ? [0, b.id, b.nom, partVers(b.part), lienVers(b.lien)]
    : [1, b.id, b.nom, partVers(b.part), b.membres.map(membreVers)];
}
function benefDe(a: any): Beneficiaire {
  return a[0] === 0
    ? { kind: 'personne', id: a[1], nom: a[2], part: partDe(a[3]), lien: lienDe(a[4]) }
    : { kind: 'groupe', id: a[1], nom: a[2], part: partDe(a[3]), membres: (a[4] ?? []).map(membreDe) };
}
function attrVers(a: Attribution): unknown[] {
  return [a.id, a.bienId, a.beneficiaireId, a.imputation === 'horsPart' ? 1 : 0];
}
function attrDe(a: any): Attribution {
  return { id: a[0], bienId: a[1], beneficiaireId: a[2], imputation: a[3] === 1 ? 'horsPart' : 'surPart' };
}

function toTuple(p: Partage): unknown[] {
  return [
    VERSION,
    p.contexte === 'note' ? 1 : 0,
    p.titre,
    p.biens.map(bienVers),
    p.passif.map((x) => [x.id, x.libelle, x.montantEuros]),
    p.beneficiaires.map(benefVers),
    p.attributions.map(attrVers),
  ];
}
function fromTuple(t: any): Partage | null {
  if (!Array.isArray(t) || t[0] !== VERSION) return null;
  return {
    contexte: t[1] === 1 ? 'note' : 'succession',
    titre: typeof t[2] === 'string' ? t[2] : '',
    devise: 'EUR',
    biens: (t[3] ?? []).map(bienDe),
    passif: (t[4] ?? []).map((x: any) => ({ id: x[0], libelle: x[1], montantEuros: x[2] })),
    beneficiaires: (t[5] ?? []).map(benefDe),
    attributions: (t[6] ?? []).map(attrDe),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// --- API ---------------------------------------------------------------------

export function encoder(s: Partage): string {
  return compressToEncodedURIComponent(JSON.stringify(toTuple(compacter(s))));
}

export function decoder(param: string): Partage | null {
  try {
    const json = decompressFromEncodedURIComponent(param);
    return json ? fromTuple(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

// Compatibilité : anciens liens #p=<base64 UTF-8 du JSON complet>.
function decoderLegacy(param: string): Partage | null {
  try {
    const bin = atob(decodeURIComponent(param));
    const obj = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (!obj || !Array.isArray(obj.biens) || !Array.isArray(obj.beneficiaires)) return null;
    if (obj.contexte !== 'succession' && obj.contexte !== 'note') obj.contexte = 'succession';
    return obj as Partage;
  } catch {
    return null;
  }
}

/** URL partageable complète (état compressé dans le hash). */
export function lienPartage(s: Partage): string {
  return `${location.origin}${location.pathname}#z=${encoder(s)}`;
}

/** Lit l'état depuis le hash : #z=<compressé> (ou ancien #p=<base64>). */
export function lireDepuisURL(): Partage | null {
  if (typeof location === 'undefined') return null; // pas de location en SSR/tests
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const params = new URLSearchParams(hash);
  const z = params.get('z');
  if (z) return decoder(z);
  const p = params.get('p');
  return p ? decoderLegacy(p) : null;
}
