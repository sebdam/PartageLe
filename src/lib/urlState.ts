import type { Succession } from './model';

/**
 * Partage par lien : l'état est encodé dans l'URL (zéro backend).
 * On « partage le ! » en envoyant simplement l'adresse.
 */

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encoder(s: Succession): string {
  return encodeURIComponent(toBase64(JSON.stringify(s)));
}

export function decoder(param: string): Succession | null {
  try {
    const json = fromBase64(decodeURIComponent(param));
    const obj = JSON.parse(json);
    if (obj && Array.isArray(obj.biens) && Array.isArray(obj.beneficiaires)) return obj as Succession;
    return null;
  } catch {
    return null;
  }
}

/** Construit l'URL partageable complète à partir d'un état. */
export function lienPartage(s: Succession): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#p=${encoder(s)}`;
}

/** Lit l'état depuis le hash de l'URL (#p=...), ou null. */
export function lireDepuisURL(): Succession | null {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const params = new URLSearchParams(hash);
  const p = params.get('p');
  return p ? decoder(p) : null;
}
