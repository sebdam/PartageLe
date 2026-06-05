<script lang="ts">
  import type { Passif } from '../lib/model';
  import { nouveauPassif } from '../lib/model';

  let { passif }: { passif: Passif[] } = $props();
</script>

<div class="liste">
  {#each passif as p, i (p.id)}
    <div class="ligne">
      <input class="grow" bind:value={p.libelle} placeholder="Dette, frais d'obsèques…" />
      <span class="avec-unite"><input class="num" bind:value={p.montantEuros} placeholder="0" inputmode="decimal" /> €</span>
      <button class="del" onclick={() => passif.splice(i, 1)} aria-label="Supprimer">×</button>
    </div>
  {/each}
</div>

<button class="add" onclick={() => passif.push(nouveauPassif())}>+ Ajouter une dette</button>
