<script lang="ts">
  import type { Membre, Lien } from '../lib/model';
  import type { Vocabulaire } from '../lib/contexte';
  import { LIENS, nouveauMembrePersonne, nouveauSousGroupe } from '../lib/model';
  import MembresEditor from './MembresEditor.svelte'; // auto-import pour la récursion

  // `niveau` = profondeur de représentation (0 = membres directs du groupe).
  let { membres, vocab, niveau = 0 }: { membres: Membre[]; vocab: Vocabulaire; niveau?: number } = $props();

  function setLien(m: Membre, v: string) {
    if (m.kind === 'personne') m.lien = v as Lien;
  }
</script>

<div class="membres">
  {#each membres as m, i (m.id)}
    {#if m.kind === 'sousGroupe'}
      <div class="souche">
        <div class="souche-tete">
          <span class="badge souche-badge">🌿 Souche · niveau {niveau + 1}</span>
          <input class="grow" bind:value={m.nom} placeholder="Héritier représenté (ex. enfant décédé)" />
          <button class="del" onclick={() => membres.splice(i, 1)} aria-label="Supprimer la souche">×</button>
        </div>
        <p class="aide souche-aide">
          Représentation : les membres ci-dessous viennent à la place de
          <strong>{m.nom || 'cet héritier'}</strong> et se partagent sa part, à parts égales.
        </p>
        <MembresEditor membres={m.membres} {vocab} niveau={niveau + 1} />
      </div>
    {:else}
      <div class="membre">
        <div class="ligne">
          <input class="grow" bind:value={m.nom} placeholder="Prénom" />
          {#if vocab.montreReserve}
            <select class="lien" value={m.kind === 'personne' ? (m.lien ?? 'autre') : 'autre'} onchange={(e) => setLien(m, e.currentTarget.value)} aria-label="Lien de parenté">
              {#each LIENS as l}<option value={l.value}>{l.label}</option>{/each}
            </select>
          {/if}
          <button class="del" onclick={() => membres.splice(i, 1)} aria-label="Supprimer">×</button>
        </div>
      </div>
    {/if}
  {/each}
</div>

<div class="ligne membres-actions">
  <button class="add petit" onclick={() => membres.push(nouveauMembrePersonne())}>
    + {vocab.id === 'note' ? 'participant' : 'personne'}
  </button>
  {#if vocab.montreRepresentation}
    <button
      class="add petit souche-add"
      onclick={() => membres.push(nouveauSousGroupe())}
      title="Représentation : remplacer un héritier décédé par ses propres héritiers, qui se partagent sa part."
    >+ souche (héritier représenté)</button>
  {/if}
</div>

{#if vocab.montreRepresentation && niveau === 0}
  <p class="aide membres-aide">
    Une <strong>souche</strong> représente un héritier décédé : ses membres viennent à la succession
    à sa place et se partagent sa part. Une souche peut elle-même contenir une souche — le « niveau » l'indique.
  </p>
{/if}
