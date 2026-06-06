# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Partage le !** is a backend-less Svelte 5 + Vite + TypeScript SPA that splits a "whole" among people in **exact fractions** (succession héritière, or an everyday "note" like a restaurant bill). Product spec and rationale live in `CONCEPT.md`.

## Commands

```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm test           # all tests (Vitest, run-once)
npm run check      # svelte-check (type-check .svelte + .ts) — run before committing UI changes
npm run build      # production build to dist/ (static, base: './')
```

- Single test file: `npx vitest run src/lib/reserve.test.ts`
- By test name: `npx vitest run -t "une souche compte pour"`
- Watch mode: `npx vitest`

There is no separate lint step; `npm run check` is the type/correctness gate.

## Architecture

### The engine is the product (pure, framework-agnostic — `src/lib/`)

A deliberate pipeline, all **exact** until a single final rounding step. Never introduce floats into calculations.

1. **`fraction.ts`** — rational arithmetic on `bigint` numerator/denominator. `Fraction.parse()` turns human decimal strings ("180 000,50") into exact fractions. `toNumber()`/`toString()` are display-only.
2. **`money.ts`** — money is `bigint` **cents**. `toCents(fraction)` rounds; `splitByFractions(totalCents, parts)` distributes by **largest remainder** so the sum lands *exactly* on the total; `arrondi()` rounds a fraction to nearest integer. `formatCents()` is `fr-FR` Intl currency (contains narrow no-break spaces — do not assert exact formatted strings in tests).
3. **`compute.ts`** — `calculer(partage): Resultat`. Builds `actif = Σ bien.valeur × quotePart`, `masse = actif − passif − horsPart`, expands the beneficiary tree into leaf fractions (Σ = 1, a `__residu__` leaf absorbs any non-allocated remainder), then `soulteCents = inKindSurPart − montantPart` per person. Also builds réservataire "slots" for réserve.
4. **`reserve.ts`** (succession) — `analyserReserve()` computes réserve globale (1→1/2, 2→2/3, 3+→3/4; spouse-only→1/4), quotité disponible, per-réservataire detail (reçu/seuil/marge) and alerts. A **souche counts as one** réservataire.
5. **`reglements.ts`** (note) — `calculerReglements()` turns net balances into a minimal "who pays whom" transfer plan (greedy: biggest debtor ↔ biggest creditor).

### Context / vocabulary layer — `contexte.ts`

`Contexte = 'succession' | 'note'`. One **`Vocabulaire`** object per context drives **every** UI label *and* feature flags (`montreQuotePart`, `montrePassif`, `montreImputation`, `montreRepresentation`, `montreReserve`). The same engine powers both; only wording and visible sections change. **Critical semantic difference:** in `note` mode an *attribution* means "**who paid**" (not "who receives"). The engine always computes `soulte = received − share`; the displayed sign is normalized in the UI/PDF (`aRegler = contexte==='note' ? -soulte : soulte`). Succession's recap doesn't balance to zero (estate liquidity fills the gap); note's does, hence the pairwise reglements.

### Model — `model.ts`

`Partage = { contexte, biens, passif, beneficiaires, attributions }`. Beneficiaries are a **tree**: top-level `Personne | Groupe`; a `Groupe` splits its part equally among `Membre`s, where a `Membre` is a `Personne` or a `sousGroupe` (= a **souche** representing a deceased heir → recursion / representation). A `Part` is expressed *relative to its container* (`fraction | pourcent | reste`). `lien` (`enfant|conjoint|autre`) feeds the réserve calc. Factories (`nouveauBien`, etc.) and `listerPersonnes()` live here.

### State & sharing — `urlState.ts`

Zero backend: the entire `Partage` (context included) is base64-encoded into the URL hash. "Partager le lien" = send the URL; the recipient lands directly in the right context. Guards `location` so it is SSR/test-safe.

### UI — Svelte 5 runes (`App.svelte`, `components/`, `app.css`)

`App.svelte` holds `partage = $state<Partage|null>()` (null ⇒ Landing) and `resultat = $derived(calculer(partage))`. Editor components receive slices of the `$state` proxy and **mutate it directly** (Svelte 5 deep reactivity) — no event dispatching. `MembresEditor` is recursive (self-import). `Resultat.svelte` renders the result and triggers PDF export. `pdf.ts` builds the PDF with jsPDF + jspdf-autotable, both **dynamically imported** so they stay out of the initial bundle (loaded only on "Exporter en PDF").

## Conventions & gotchas

- **Svelte 5 only**: runes (`$state`, `$derived`, `$props`), `onclick=` handlers, `mount()` in `main.ts`. `tsconfig` has `isolatedModules` + `verbatimModuleSyntax` → use `import type` for type-only imports.
- **Vitest + Svelte**: `vite.config.ts` sets `resolve.conditions: ['browser']` *only under VITEST* so `mount()` resolves Svelte's client build. Component/render tests use `// @vitest-environment jsdom` (see `App.smoke.test.ts`); engine and PDF tests run in node.
- **Mobile / CSS**: the responsive grid uses `grid-template-columns: minmax(0, 1fr)` (not `1fr`) and `select { max-width: 100% }` — both prevent horizontal overflow from unbreakable content. Mobile rules live in a `@media (max-width: 600px)` block in `app.css`.
- **PDF text**: `pdf.ts` uses its own plain euro formatter (regular spaces) instead of `formatCents` to avoid missing-glyph issues in the PDF font.

## Branches & deploy

`develop` is the default/working branch; `main` is production. **Shipping = a PR `develop → main`**; merging it pushes to `main`, which triggers `.github/workflows/deploy.yml` (check → test → build → GitHub Pages). Do not push directly to `main`. Live at https://sebdam.github.io/PartageLe/
