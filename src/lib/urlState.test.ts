import { describe, it, expect } from 'vitest';
import { encoder, decoder } from './urlState';
import { successionExemple, noteExemple } from './sample';
import { calculer } from './compute';

for (const [nom, faire] of [['succession', successionExemple], ['note', noteExemple]] as const) {
  describe(`urlState — ${nom}`, () => {
    const s = faire();
    const d = decoder(encoder(s));

    it('round-trip : même calcul (montants, soultes, réserve)', () => {
      expect(d).not.toBeNull();
      expect(d!.contexte).toBe(s.contexte);
      const a = calculer(s);
      const b = calculer(d!);
      expect(b.masseCents).toBe(a.masseCents);
      expect(b.lignes.map((l) => [l.nom, l.montantCents, l.soulteCents])).toEqual(
        a.lignes.map((l) => [l.nom, l.montantCents, l.soulteCents]),
      );
      expect(b.reserve).toEqual(a.reserve);
    });

    it('préserve les champs hors calcul (catégorie, quote-part, passif, imputation)', () => {
      expect(d!.biens.map((x) => x.categorie)).toEqual(s.biens.map((x) => x.categorie));
      expect(d!.biens.map((x) => [x.quotePart.n, x.quotePart.d])).toEqual(s.biens.map((x) => [x.quotePart.n, x.quotePart.d]));
      expect(d!.passif.map((x) => [x.libelle, x.montantEuros])).toEqual(s.passif.map((x) => [x.libelle, x.montantEuros]));
      expect(d!.attributions.map((x) => x.imputation)).toEqual(s.attributions.map((x) => x.imputation));
    });

    it('encodage idempotent et plus court que le JSON', () => {
      const once = encoder(s);
      expect(encoder(decoder(once)!)).toBe(once);
      expect(once.length).toBeLessThan(JSON.stringify(s).length);
    });

    it('rejette une entrée invalide', () => {
      expect(decoder('nimportequoi')).toBeNull();
    });
  });
}
