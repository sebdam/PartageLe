<script lang="ts">
  import type { Bien } from '../lib/model';
  import { CATEGORIES, nouveauBien } from '../lib/model';
  import { Fraction } from '../lib/fraction';
  import { formatCents, toCents } from '../lib/money';

  let { biens }: { biens: Bien[] } = $props();

  // Valeur réellement entrante dans la succession = valeur × quote-part du défunt.
  function entrante(b: Bien): string {
    const qp = b.quotePart.d === 0 ? Fraction.zero : Fraction.ratio(b.quotePart.n, b.quotePart.d);
    return formatCents(toCents(Fraction.parse(b.valeurEuros).mul(qp)));
  }
</script>

<div class="liste">
  {#each biens as bien, i (bien.id)}
    <div class="carte-ligne">
      <div class="ligne">
        <input class="grow" bind:value={bien.nom} placeholder="Nom du bien (ex. Maison)" />
        <select bind:value={bien.categorie}>
          {#each CATEGORIES as c}<option value={c.value}>{c.label}</option>{/each}
        </select>
        <button class="del" onclick={() => biens.splice(i, 1)} aria-label="Supprimer le bien">×</button>
      </div>
      <div class="ligne">
        <label class="champ">
          Valeur totale
          <span class="avec-unite"><input bind:value={bien.valeurEuros} placeholder="0" inputmode="decimal" /> €</span>
        </label>
        <label class="champ">
          Part du défunt
          <span class="frac">
            <input type="number" min="0" bind:value={bien.quotePart.n} />
            <span>/</span>
            <input type="number" min="1" bind:value={bien.quotePart.d} />
          </span>
        </label>
        <span class="entrante">entre&nbsp;: <strong>{entrante(bien)}</strong></span>
      </div>
    </div>
  {/each}
</div>

<button class="add" onclick={() => biens.push(nouveauBien())}>+ Ajouter un bien</button>
