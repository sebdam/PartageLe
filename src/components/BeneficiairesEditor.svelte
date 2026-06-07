<script lang="ts">
  import type { Partage, Beneficiaire, Membre, Lien } from '../lib/model';
  import type { Vocabulaire } from '../lib/contexte';
  import { LIENS, nouvellePersonne, nouveauGroupe } from '../lib/model';
  import PartEditor from './PartEditor.svelte';
  import MembresEditor from './MembresEditor.svelte';

  let { partage, vocab }: { partage: Partage; vocab: Vocabulaire } = $props();

  // Y a-t-il au moins un descendant (enfant), éventuellement dans un groupe / une souche ?
  const aEnfant = $derived.by(() => {
    const cherche = (n: Beneficiaire | Membre): boolean =>
      n.kind === 'personne' ? n.lien === 'enfant' : n.membres.some(cherche);
    return partage.beneficiaires.some(cherche);
  });
  // Avec un conjoint ET un descendant, le conjoint a exactement deux options (art. 757) :
  // 1/4 en pleine propriété, ou 100 % en usufruit. On remplace alors l'éditeur de part.
  function optionConjoint(b: Beneficiaire): boolean {
    return vocab.montreReserve && b.kind === 'personne' && b.lien === 'conjoint' && aEnfant;
  }

  function setLien(b: Beneficiaire, v: string) {
    if (b.kind === 'personne') b.lien = v as Lien;
  }
  function setDroitsConjoint(v: string) {
    partage.usufruitConjoint = v === 'usufruit' ? (partage.usufruitConjoint ?? 70) : undefined;
  }
</script>

<div class="liste">
  {#each partage.beneficiaires as b, i (b.id)}
    <div class="carte-ligne">
      <div class="ligne">
        {#if b.kind === 'groupe'}<span class="badge">groupe</span>{/if}
        <input class="grow" bind:value={b.nom} placeholder={b.kind === 'groupe' ? vocab.groupeNomPlaceholder : 'Nom'} />
        {#if vocab.montreReserve && b.kind === 'personne'}
          <select class="lien" value={b.kind === 'personne' ? (b.lien ?? 'autre') : 'autre'} onchange={(e) => setLien(b, e.currentTarget.value)} aria-label="Lien de parenté">
            {#each LIENS as l}<option value={l.value}>{l.label}</option>{/each}
          </select>
        {/if}
        {#if optionConjoint(b)}
          <select class="lien" value={partage.usufruitConjoint != null ? 'usufruit' : 'pp'} onchange={(e) => setDroitsConjoint(e.currentTarget.value)} aria-label="Droits du conjoint">
            <option value="pp">¼ en pleine propriété</option>
            <option value="usufruit">100 % en usufruit</option>
          </select>
          {#if partage.usufruitConjoint != null}
            <label class="champ">Âge
              <input class="num" type="number" min="0" max="120" bind:value={partage.usufruitConjoint} />
            </label>
          {/if}
        {:else}
          <PartEditor owner={b} />
        {/if}
        <button class="del" onclick={() => partage.beneficiaires.splice(i, 1)} aria-label="Supprimer">×</button>
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
  <button class="add" onclick={() => partage.beneficiaires.push(nouvellePersonne())}>+ {vocab.ajoutPersonne}</button>
  <button class="add" onclick={() => partage.beneficiaires.push(nouveauGroupe())}>+ {vocab.ajoutGroupe}</button>
</div>
