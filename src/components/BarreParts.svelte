<script lang="ts">
  import type { LigneResultat } from '../lib/compute';

  let { lignes }: { lignes: LigneResultat[] } = $props();

  const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#a855f7'];

  function couleur(i: number, l: LigneResultat): string {
    return l.estResidu ? 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 6px,#cbd5e1 6px,#cbd5e1 12px)' : palette[i % palette.length];
  }
  function largeur(l: LigneResultat): number {
    return Math.max(0, l.pourcent);
  }
</script>

<div class="barre" role="img" aria-label="Répartition des parts">
  {#each lignes as l, i (l.id)}
    <div class="seg" style="width:{largeur(l)}%; background:{couleur(i, l)}" title="{l.nom} — {largeur(l).toFixed(1)} %"></div>
  {/each}
</div>

<div class="legende">
  {#each lignes as l, i (l.id)}
    <span class="lg"><i style="background:{couleur(i, l)}"></i>{l.nom}</span>
  {/each}
</div>
