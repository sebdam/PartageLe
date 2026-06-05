<script lang="ts">
  import type { Partage } from '../lib/model';
  import type { Vocabulaire } from '../lib/contexte';
  import { uid, listerPersonnes } from '../lib/model';

  let { partage, vocab }: { partage: Partage; vocab: Vocabulaire } = $props();

  const personnes = $derived(listerPersonnes(partage));

  function ajouter() {
    partage.attributions.push({
      id: uid('att'),
      bienId: partage.biens[0]?.id ?? '',
      beneficiaireId: personnes[0]?.id ?? '',
      imputation: 'surPart',
    });
  }
</script>

<div class="liste">
  {#each partage.attributions as att, i (att.id)}
    <div class="ligne wrap">
      <select bind:value={att.bienId}>
        {#each partage.biens as b}<option value={b.id}>{b.nom || '—'}</option>{/each}
      </select>
      <span class="fleche">{vocab.prepositionAttribution}</span>
      <select bind:value={att.beneficiaireId}>
        {#each personnes as p}<option value={p.id}>{p.nom}</option>{/each}
      </select>
      {#if vocab.montreImputation}
        <select bind:value={att.imputation}>
          <option value="surPart">{vocab.labelSurPart}</option>
          <option value="horsPart">{vocab.labelHorsPart}</option>
        </select>
      {/if}
      <button class="del" onclick={() => partage.attributions.splice(i, 1)} aria-label="Supprimer">×</button>
    </div>
  {/each}
</div>

{#if partage.biens.length === 0 || personnes.length === 0}
  <p class="aide">Ajoute au moins un élément et un participant pour pouvoir attribuer.</p>
{:else}
  <button class="add" onclick={ajouter}>+ {vocab.attribuer}</button>
{/if}
