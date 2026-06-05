<script lang="ts">
  import type { Beneficiaire, Lien } from '../lib/model';
  import type { Vocabulaire } from '../lib/contexte';
  import { LIENS, nouvellePersonne, nouveauGroupe } from '../lib/model';
  import PartEditor from './PartEditor.svelte';
  import MembresEditor from './MembresEditor.svelte';

  let { beneficiaires, vocab }: { beneficiaires: Beneficiaire[]; vocab: Vocabulaire } = $props();

  function setLien(b: Beneficiaire, v: string) {
    if (b.kind === 'personne') b.lien = v as Lien;
  }
</script>

<div class="liste">
  {#each beneficiaires as b, i (b.id)}
    <div class="carte-ligne">
      <div class="ligne">
        {#if b.kind === 'groupe'}<span class="badge">groupe</span>{/if}
        <input class="grow" bind:value={b.nom} placeholder={b.kind === 'groupe' ? vocab.groupeNomPlaceholder : 'Nom'} />
        {#if vocab.montreReserve && b.kind === 'personne'}
          <select class="lien" value={b.kind === 'personne' ? (b.lien ?? 'autre') : 'autre'} onchange={(e) => setLien(b, e.currentTarget.value)} aria-label="Lien de parenté">
            {#each LIENS as l}<option value={l.value}>{l.label}</option>{/each}
          </select>
        {/if}
        <PartEditor owner={b} />
        <button class="del" onclick={() => beneficiaires.splice(i, 1)} aria-label="Supprimer">×</button>
      </div>
      {#if b.kind === 'groupe'}
        <div class="sous">
          <p class="aide">{vocab.aideGroupe}</p>
          <MembresEditor membres={b.membres} {vocab} />
        </div>
      {/if}
    </div>
  {/each}
</div>

<div class="ligne">
  <button class="add" onclick={() => beneficiaires.push(nouvellePersonne())}>+ {vocab.ajoutPersonne}</button>
  <button class="add" onclick={() => beneficiaires.push(nouveauGroupe())}>+ {vocab.ajoutGroupe}</button>
</div>
