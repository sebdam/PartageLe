<script lang="ts">
  import type { Contexte } from '../lib/contexte';
  import { VOCABULAIRES } from '../lib/contexte';

  let { onChoisir }: { onChoisir: (c: Contexte) => void } = $props();

  const choix: Contexte[] = ['succession', 'note'];
</script>

<div class="landing">
  <header class="landing-tete">
    <h1>Partage&nbsp;le&nbsp;!</h1>
    <p class="accroche">Partager équitablement, sans se battre avec les fractions.</p>
    <p class="landing-sous">Que veux-tu partager&nbsp;?</p>
  </header>

  <div class="cartes-choix">
    {#each choix as c (c)}
      {@const v = VOCABULAIRES[c]}
      <button class="carte-choix" onclick={() => onChoisir(c)}>
        <span class="emoji">{v.emoji}</span>
        <span class="nom">{v.nom}</span>
        <span class="desc">{v.landingDesc}</span>
      </button>
    {/each}
  </div>

  <p class="pied-landing">Calcul en fractions exactes · partage par lien · zéro donnée envoyée.</p>
</div>
