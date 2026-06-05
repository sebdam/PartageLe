import { describe, it, expect } from 'vitest';
import { construirePdf } from './pdf';
import { calculer } from './compute';
import { successionExemple, noteExemple } from './sample';
import { vocabulaire } from './contexte';

function octets(doc: Awaited<ReturnType<typeof construirePdf>>): number {
  return (doc.output('arraybuffer') as ArrayBuffer).byteLength;
}

describe('construirePdf', () => {
  it('génère un PDF non vide pour une succession', async () => {
    const doc = await construirePdf(calculer(successionExemple()), vocabulaire('succession'));
    expect(octets(doc)).toBeGreaterThan(1000);
  });

  it('génère un PDF non vide pour une note', async () => {
    const doc = await construirePdf(calculer(noteExemple()), vocabulaire('note'));
    expect(octets(doc)).toBeGreaterThan(1000);
  });
});
