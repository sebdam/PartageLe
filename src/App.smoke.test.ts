// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount, unmount } from 'svelte';
import App from './App.svelte';
import { encoder } from './lib/urlState';
import { successionExemple, noteExemple } from './lib/sample';

// On charge un partage via l'URL (#p=...) pour court-circuiter la landing,
// ce qui vérifie aussi que le lien restitue le bon contexte / vocabulaire.
function rendre(hash: string): { app: ReturnType<typeof mount>; txt: string } {
  location.hash = hash;
  document.body.innerHTML = '<div id="app"></div>';
  const app = mount(App, { target: document.getElementById('app')! });
  return { app, txt: document.body.textContent ?? '' };
}

describe('App (rendu)', () => {
  it('affiche la landing quand il n’y a pas de lien', () => {
    const { app, txt } = rendre('');
    expect(txt).toContain('Que veux-tu partager');
    expect(txt).toContain('Succession');
    expect(txt).toContain('Note');
    unmount(app);
  });

  it('restitue une succession depuis le lien (vocabulaire succession)', () => {
    const { app, txt } = rendre('#p=' + encoder(successionExemple()));
    expect(txt).toContain('Madame Y');
    expect(txt).toContain('Les 9 enfants');
    expect(txt).toContain('Masse à partager');
    expect(txt).toContain('verse'); // Paul verse 4 000 €
    unmount(app);
  });

  it('restitue une note depuis le lien (vocabulaire note)', () => {
    const { app, txt } = rendre('#p=' + encoder(noteExemple()));
    expect(txt).toContain('Alice');
    expect(txt).toContain('Total à partager');
    expect(txt).toContain('Remboursements');
    expect(txt).toContain('doit'); // Bob/Chloé doivent
    unmount(app);
  });
});
