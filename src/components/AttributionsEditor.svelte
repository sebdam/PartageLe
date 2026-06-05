<script lang="ts">
  import type { Succession } from '../lib/model';
  import { uid, listerPersonnes } from '../lib/model';

  let { succession }: { succession: Succession } = $props();

  const personnes = $derived(listerPersonnes(succession));

  function ajouter() {
    succession.attributions.push({
      id: uid('att'),
      bienId: succession.biens[0]?.id ?? '',
      beneficiaireId: personnes[0]?.id ?? '',
      imputation: 'surPart',
    });
  }
</script>

<div class="liste">
  {#each succession.attributions as att, i (att.id)}
    <div class="ligne wrap">
      <select bind:value={att.bienId}>
        {#each succession.biens as b}<option value={b.id}>{b.nom || 'Bien'}</option>{/each}
      </select>
      <span class="fleche">→</span>
      <select bind:value={att.beneficiaireId}>
        {#each personnes as p}<option value={p.id}>{p.nom}</option>{/each}
      </select>
      <select bind:value={att.imputation}>
        <option value="surPart">sur part (soulte)</option>
        <option value="horsPart">hors part (en plus)</option>
      </select>
      <button class="del" onclick={() => succession.attributions.splice(i, 1)} aria-label="Supprimer">×</button>
    </div>
  {/each}
</div>

{#if succession.biens.length === 0 || personnes.length === 0}
  <p class="aide">Ajoute au moins un bien et un bénéficiaire pour pouvoir attribuer.</p>
{:else}
  <button class="add" onclick={ajouter}>+ Attribuer un bien</button>
{/if}
