<script lang="ts">
  import type { Beneficiaire } from '../lib/model';
  import { nouvellePersonne, nouveauGroupe } from '../lib/model';
  import PartEditor from './PartEditor.svelte';
  import MembresEditor from './MembresEditor.svelte';

  let { beneficiaires }: { beneficiaires: Beneficiaire[] } = $props();
</script>

<div class="liste">
  {#each beneficiaires as b, i (b.id)}
    <div class="carte-ligne">
      <div class="ligne">
        {#if b.kind === 'groupe'}<span class="badge">groupe</span>{/if}
        <input class="grow" bind:value={b.nom} placeholder={b.kind === 'groupe' ? 'Nom du groupe (ex. Les enfants)' : 'Nom'} />
        <PartEditor owner={b} />
        <button class="del" onclick={() => beneficiaires.splice(i, 1)} aria-label="Supprimer">×</button>
      </div>
      {#if b.kind === 'groupe'}
        <div class="sous">
          <p class="aide">Réparti à parts égales entre les membres.</p>
          <MembresEditor membres={b.membres} />
        </div>
      {/if}
    </div>
  {/each}
</div>

<div class="ligne">
  <button class="add" onclick={() => beneficiaires.push(nouvellePersonne())}>+ Une personne</button>
  <button class="add" onclick={() => beneficiaires.push(nouveauGroupe())}>+ Un groupe</button>
</div>
