<script lang="ts">
  import type { Part } from '../lib/model';

  // `owner` est l'objet (personne ou groupe) qui porte la part ; on mute owner.part.
  let { owner }: { owner: { part: Part } } = $props();

  function setType(type: Part['type']) {
    if (type === 'fraction') owner.part = { type: 'fraction', n: 1, d: 2 };
    else if (type === 'pourcent') owner.part = { type: 'pourcent', valeur: '' };
    else owner.part = { type: 'reste' };
  }

  function setN(v: number) {
    if (owner.part.type === 'fraction') owner.part = { ...owner.part, n: Number.isFinite(v) ? v : 0 };
  }
  function setD(v: number) {
    if (owner.part.type === 'fraction') owner.part = { ...owner.part, d: Number.isFinite(v) ? v : 1 };
  }
  function setValeur(v: string) {
    if (owner.part.type === 'pourcent') owner.part = { ...owner.part, valeur: v };
  }
</script>

<div class="part-editor">
  <select
    aria-label="Type de part"
    value={owner.part.type}
    onchange={(e) => setType(e.currentTarget.value as Part['type'])}
  >
    <option value="fraction">Fraction</option>
    <option value="pourcent">Pourcentage</option>
    <option value="reste">Le reste</option>
  </select>

  {#if owner.part.type === 'fraction'}
    <span class="frac">
      <input type="number" min="0" value={owner.part.n} oninput={(e) => setN(e.currentTarget.valueAsNumber)} />
      <span>/</span>
      <input type="number" min="1" value={owner.part.d} oninput={(e) => setD(e.currentTarget.valueAsNumber)} />
    </span>
  {:else if owner.part.type === 'pourcent'}
    <span class="frac">
      <input type="text" inputmode="decimal" placeholder="25" value={owner.part.valeur} oninput={(e) => setValeur(e.currentTarget.value)} />
      <span>%</span>
    </span>
  {:else}
    <span class="reste-tag">se calcule tout seul</span>
  {/if}
</div>
