<script lang="ts">
  import type { Passif } from '../lib/model';
  import type { Vocabulaire } from '../lib/contexte';
  import { nouveauPassif } from '../lib/model';

  let { passif, vocab }: { passif: Passif[]; vocab: Vocabulaire } = $props();
</script>

<div class="liste">
  {#each passif as p, i (p.id)}
    <div class="ligne">
      <input class="grow" bind:value={p.libelle} placeholder={vocab.passifLibellePlaceholder} />
      <span class="avec-unite"><input class="num" bind:value={p.montantEuros} placeholder="0" inputmode="decimal" /> €</span>
      <button class="del" onclick={() => passif.splice(i, 1)} aria-label="Supprimer">×</button>
    </div>
  {/each}
</div>

<button class="add" onclick={() => passif.push(nouveauPassif())}>+ Ajouter une dette</button>
