<script lang="ts">
  import type { Partage, Beneficiaire, Membre, Lien, OptionConjoint } from '../lib/model';
  import type { Vocabulaire } from '../lib/contexte';
  import { LIENS, nouvellePersonne, nouveauGroupe } from '../lib/model';
  import PartEditor from './PartEditor.svelte';
  import MembresEditor from './MembresEditor.svelte';

  let { partage, vocab }: { partage: Partage; vocab: Vocabulaire } = $props();

  // Y a-t-il au moins un descendant ? Et combien de souches (une souche = un enfant) ?
  const nbEnfants = $derived.by(() => {
    let n = 0;
    const contient = (m: Membre): boolean => (m.kind === 'personne' ? m.lien === 'enfant' : m.membres.some(contient));
    const visite = (m: Membre) => {
      if (m.kind === 'personne') {
        if (m.lien === 'enfant') n += 1;
      } else if (contient(m)) n += 1; // souche
      else m.membres.forEach(visite);
    };
    for (const b of partage.beneficiaires) {
      if (b.kind === 'personne') {
        if (b.lien === 'enfant') n += 1;
      } else b.membres.forEach(visite);
    }
    return n;
  });
  const qdLabel = $derived(nbEnfants <= 1 ? '½' : nbEnfants === 2 ? '⅓' : '¼');

  // Avec un conjoint ET un descendant, le conjoint a des droits spécifiques (art. 757 / 1094-1) :
  // on remplace alors l'éditeur de part par le choix de ces droits.
  function optionConjoint(b: Beneficiaire): boolean {
    return vocab.montreReserve && b.kind === 'personne' && b.lien === 'conjoint' && nbEnfants > 0;
  }
  const choixConjoint: OptionConjoint = $derived(
    partage.optionConjoint ?? (partage.usufruitConjoint != null ? 'usufruit' : 'quartPP'),
  );
  const avecUsufruit = $derived(choixConjoint === 'usufruit' || choixConjoint === 'quartUsufruit');

  function setLien(b: Beneficiaire, v: string) {
    if (b.kind === 'personne') b.lien = v as Lien;
  }
  function setDroitsConjoint(v: string) {
    partage.optionConjoint = v as OptionConjoint;
    if (v === 'usufruit' || v === 'quartUsufruit') {
      if (partage.usufruitConjoint == null) partage.usufruitConjoint = 70;
    } else {
      partage.usufruitConjoint = undefined;
    }
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
          <select class="lien" value={choixConjoint} onchange={(e) => setDroitsConjoint(e.currentTarget.value)} aria-label="Droits du conjoint">
            <optgroup label="Sans donation (légal)">
              <option value="quartPP">¼ en pleine propriété</option>
              <option value="usufruit">100 % en usufruit</option>
            </optgroup>
            <optgroup label="Donation au dernier vivant">
              <option value="qdPP">Quotité dispo. en PP ({qdLabel})</option>
              <option value="quartUsufruit">¼ PP + ¾ usufruit</option>
            </optgroup>
          </select>
          {#if avecUsufruit}
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
