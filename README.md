# Partage le !

> Partager équitablement, sans se battre avec les fractions.

**Partage le !** est une app web simple et fluide pour répartir un patrimoine —
d'abord pensée pour les **successions** — et obtenir une vue claire des parts de
chacun (en fractions, en pourcentages et en euros), calcul des **soultes**
compris. Tout se calcule en **fractions exactes** (aucun arrondi parasite) et
rien n'est envoyé sur un serveur : l'état d'un partage est encodé dans le lien.

📄 Le concept détaillé et le cahier des charges : **[`CONCEPT.md`](./CONCEPT.md)**.

> ⚠️ Outil d'aide à la réflexion. Ne remplace pas un notaire.

## Lancer en local

```bash
npm install
npm run dev        # puis ouvre http://localhost:5173
```

Autres commandes : `npm test` (moteur + rendu), `npm run check` (types),
`npm run build` (génère le dossier statique `dist/`).

## Déploiement (GitHub Pages)

Le workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
vérifie (types + tests), build, puis publie l'app à chaque push sur la branche
par défaut.

Mise en route, une seule fois :

1. **Rendre le repo public** — Settings → General → Change repository visibility
   *(Pages gratuit nécessite un repo public)*.
2. **Activer Pages** — Settings → Pages → Build and deployment → **Source : GitHub Actions**.
3. **Déclencher** — onglet **Actions** → *Deploy to GitHub Pages* → **Run workflow**
   (ou pousse n'importe quel commit).

Une fois en ligne : **https://sebdam.github.io/PartageLe/**

## Stack

Svelte 5 · Vite · TypeScript · Vitest. 100 % statique, hébergeable n'importe où.

---

**État** : MVP fonctionnel.
