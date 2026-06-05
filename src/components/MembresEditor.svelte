<script lang="ts">
  import type { Membre } from '../lib/model';
  import { nouveauMembrePersonne, nouveauSousGroupe } from '../lib/model';
  import MembresEditor from './MembresEditor.svelte'; // auto-import pour la récursion

  // Composant récursif : un sous-groupe (représentation) contient lui-même des membres.
  let { membres }: { membres: Membre[] } = $props();
</script>

<div class="membres">
  {#each membres as m, i (m.id)}
    <div class="membre">
      <div class="ligne">
        {#if m.kind === 'sousGroupe'}<span class="badge">souche</span>{/if}
        <input class="grow" bind:value={m.nom} placeholder={m.kind === 'sousGroupe' ? 'Nom de la souche (héritier décédé)' : 'Prénom'} />
        <button class="del" onclick={() => membres.splice(i, 1)} aria-label="Supprimer">×</button>
      </div>
      {#if m.kind === 'sousGroupe'}
        <MembresEditor membres={m.membres} />
      {/if}
    </div>
  {/each}
</div>

<div class="ligne">
  <button class="add petit" onclick={() => membres.push(nouveauMembrePersonne())}>+ personne</button>
  <button class="add petit" onclick={() => membres.push(nouveauSousGroupe())}>+ souche (représentation)</button>
</div>
