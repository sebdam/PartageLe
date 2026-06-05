import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// La config Vite sert aussi à Vitest (bloc `test`), d'où l'import depuis vitest/config.
const sousVitest = !!process.env.VITEST;

export default defineConfig({
  plugins: [svelte()],
  // App 100 % statique : un chemin relatif permet de l'héberger n'importe où.
  base: './',
  // Sous Vitest, on résout l'entrée « browser » de Svelte pour que mount() soit disponible.
  resolve: sousVitest ? { conditions: ['browser'] } : {},
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
