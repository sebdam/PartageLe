import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Beneficiaire, Membre, Partage } from './model';

/**
 * Partage par lien (zéro backend) : l'état complet est COMPRESSÉ (lz-string) et
 * placé dans le hash de l'URL. Les identifiants sont d'abord raccourcis, pour des
 * liens nettement plus courts (~−50 %, compatibles SMS). Les anciens liens
 * (#p=<base64>) restent lisibles.
 */

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
  // Les attributions référencent des biens/personnes déjà remappés ci-dessus.
  const attributions = p.attributions.map((a) => ({
    ...a,
    id: remap(a.id),
    bienId: map.get(a.bienId) ?? a.bienId,
    beneficiaireId: map.get(a.beneficiaireId) ?? a.beneficiaireId,
  }));
  return { ...p, biens, passif, beneficiaires, attributions };
}

function estPartage(obj: unknown): obj is Partage {
  return (
    !!obj &&
    typeof obj === 'object' &&
    Array.isArray((obj as Partage).biens) &&
    Array.isArray((obj as Partage).beneficiaires)
  );
}

function normaliserContexte(p: Partage): Partage {
  if (p.contexte !== 'succession' && p.contexte !== 'note') p.contexte = 'succession';
  return p;
}

export function encoder(s: Partage): string {
  return compressToEncodedURIComponent(JSON.stringify(compacter(s)));
}

export function decoder(param: string): Partage | null {
  try {
    const json = decompressFromEncodedURIComponent(param);
    if (!json) return null;
    const obj = JSON.parse(json);
    return estPartage(obj) ? normaliserContexte(obj) : null;
  } catch {
    return null;
  }
}

// --- Compatibilité : anciens liens #p=<base64 UTF-8> ------------------------
function fromBase64(b64: string): string {
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
function decoderLegacy(param: string): Partage | null {
  try {
    const obj = JSON.parse(fromBase64(decodeURIComponent(param)));
    return estPartage(obj) ? normaliserContexte(obj) : null;
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
