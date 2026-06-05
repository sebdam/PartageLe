<script lang="ts">
  import type { Resultat } from '../lib/compute';
  import { formatCents } from '../lib/money';
  import BarreParts from './BarreParts.svelte';

  let { resultat }: { resultat: Resultat } = $props();

  const personnes = $derived(resultat.lignes.filter((l) => !l.estResidu));
  const aVerser = $derived(personnes.filter((l) => l.soulteCents > 0n));
  const aRecevoir = $derived(personnes.filter((l) => l.soulteCents < 0n));

  function formatPct(v: number): string {
    return `${(Math.round(v * 100) / 100).toLocaleString('fr-FR')} %`;
  }
  function soulteTexte(cents: bigint): string {
    if (cents > 0n) return `verse ${formatCents(cents)}`;
    if (cents < 0n) return `reçoit ${formatCents(-cents)}`;
    return '—';
  }
</script>

<div class="resultat">
  <h2>Résultat</h2>

  <div class="masse">
    <div><span>Actif</span><strong>{formatCents(resultat.actifCents)}</strong></div>
    {#if resultat.passifCents > 0n}
      <div><span>− Passif</span><strong>{formatCents(resultat.passifCents)}</strong></div>
    {/if}
    {#if resultat.horsPartCents > 0n}
      <div><span>− Attributions hors part</span><strong>{formatCents(resultat.horsPartCents)}</strong></div>
    {/if}
    <div class="total"><span>= Masse à partager</span><strong>{formatCents(resultat.masseCents)}</strong></div>
  </div>

  {#if resultat.avertissements.length > 0}
    <ul class="avertissements">
      {#each resultat.avertissements as a}<li>⚠️ {a}</li>{/each}
    </ul>
  {/if}

  <BarreParts lignes={resultat.lignes} />

  <table class="parts">
    <thead>
      <tr><th>Bénéficiaire</th><th>Part</th><th class="r">Montant</th><th class="r">Soulte</th></tr>
    </thead>
    <tbody>
      {#each resultat.lignes as l (l.id)}
        <tr class:residu={l.estResidu}>
          <td>
            <span class="nom">{l.nom}</span>
            {#if l.biensRecus.length > 0}
              <span class="biens">
                {#each l.biensRecus as b}
                  <span class="chip" class:hors={b.imputation === 'horsPart'}>{b.nom} · {formatCents(b.valeurCents)}{b.imputation === 'horsPart' ? ' (hors part)' : ''}</span>
                {/each}
              </span>
            {/if}
          </td>
          <td><span class="frac-aff">{l.fraction.toString()}</span><span class="pct">{formatPct(l.pourcent)}</span></td>
          <td class="r">{formatCents(l.montantCents)}</td>
          <td class="r soulte" class:verse={l.soulteCents > 0n} class:recoit={l.soulteCents < 0n}>
            {l.estResidu ? '' : soulteTexte(l.soulteCents)}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if aVerser.length > 0}
    <div class="recap">
      <h3>Soultes à verser</h3>
      <ul>
        {#each aVerser as l (l.id)}<li><strong>{l.nom}</strong> verse {formatCents(l.soulteCents)}</li>{/each}
      </ul>
      <p class="aide">
        Ces versements, ajoutés aux liquidités de la succession, financent les parts de
        {aRecevoir.map((l) => l.nom).join(', ')}.
        <br />La trésorerie disponible et l'éventuelle indivision (bien non liquide) ne sont pas modélisées dans cette première version.
      </p>
    </div>
  {/if}
</div>
