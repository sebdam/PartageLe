import { describe, it, expect } from 'vitest';
import { encoder, decoder } from './urlState';
import { successionExemple, noteExemple } from './sample';
import { calculer } from './compute';

for (const [nom, faire] of [['succession', successionExemple], ['note', noteExemple]] as const) {
  describe(`urlState — ${nom}`, () => {
    const s = faire();

    it('round-trip : le partage décodé donne le même calcul', () => {
      const d = decoder(encoder(s));
      expect(d).not.toBeNull();
      expect(d!.contexte).toBe(s.contexte);
      const a = calculer(s);
      const b = calculer(d!);
      expect(b.masseCents).toBe(a.masseCents);
      expect(b.lignes.map((l) => l.montantCents)).toEqual(a.lignes.map((l) => l.montantCents));
      expect(b.lignes.map((l) => l.soulteCents)).toEqual(a.lignes.map((l) => l.soulteCents));
    });

    it('encodage idempotent et plus court que le JSON', () => {
      const once = encoder(s);
      expect(encoder(decoder(once)!)).toBe(once); // ids déjà courts
      expect(once.length).toBeLessThan(JSON.stringify(s).length);
    });

    it('rejette une entrée invalide', () => {
      expect(decoder('nimportequoi')).toBeNull();
    });
  });
}
