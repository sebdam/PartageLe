// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount, unmount } from 'svelte';
import App from './App.svelte';

// Vérifie que l'app se MONTE réellement (pas seulement qu'elle compile) et
// affiche le résultat de l'exemple — attrape les erreurs d'exécution au montage.
describe('App (rendu)', () => {
  it("se monte et affiche le résultat de l'exemple", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = mount(App, { target: document.getElementById('app')! });
    const txt = document.body.textContent ?? '';

    expect(txt).toContain('Partage');
    expect(txt).toContain('Masse à partager');
    expect(txt).toContain('Madame Y');
    expect(txt).toContain('Les 9 enfants');
    // La soulte de Paul doit apparaître (il verse 4 000 €).
    expect(txt).toContain('verse');

    unmount(app);
  });
});
