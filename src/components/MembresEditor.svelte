<script lang="ts">
  import type { Membre, Lien } from '../lib/model';
  import type { Vocabulaire } from '../lib/contexte';
  import { LIENS, nouveauMembrePersonne, nouveauSousGroupe } from '../lib/model';
  import MembresEditor from './MembresEditor.svelte'; // auto-import pour la récursion

  let { membres, vocab }: { membres: Membre[]; vocab: Vocabulaire } = $props();

  function setLien(m: Membre, v: string) {
    if (m.kind === 'personne') m.lien = v as Lien;
  }
</script>

<div class="membres">
  {#each membres as m, i (m.id)}
    <div class="membre">
      <div class="ligne">
        {#if m.kind === 'sousGroupe'}<span class="badge">souche</span>{/if}
        <input class="grow" bind:value={m.nom} placeholder={m.kind === 'sousGroupe' ? 'Nom de la souche (héritier décédé)' : 'Prénom'} />
        {#if vocab.montreReserve && m.kind === 'personne'}
          <select class="lien" value={m.kind === 'personne' ? (m.lien ?? 'autre') : 'autre'} onchange={(e) => setLien(m, e.currentTarget.value)} aria-label="Lien de parenté">
            {#each LIENS as l}<option value={l.value}>{l.label}</option>{/each}
          </select>
        {/if}
        <button class="del" onclick={() => membres.splice(i, 1)} aria-label="Supprimer">×</button>
      </div>
      {#if m.kind === 'sousGroupe'}
        <MembresEditor membres={m.membres} {vocab} />
      {/if}
    </div>
  {/each}
</div>

<div class="ligne">
  <button class="add petit" onclick={() => membres.push(nouveauMembrePersonne())}>+ {vocab.id === 'note' ? 'participant' : 'personne'}</button>
  {#if vocab.montreRepresentation}
    <button class="add petit" onclick={() => membres.push(nouveauSousGroupe())}>+ souche (représentation)</button>
  {/if}
</div>
