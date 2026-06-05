<script lang="ts">
  import type { Resultat } from '../lib/compute';
  import type { Vocabulaire } from '../lib/contexte';
  import { formatCents } from '../lib/money';
  import BarreParts from './BarreParts.svelte';

  let { resultat, vocab }: { resultat: Resultat; vocab: Vocabulaire } = $props();

  // Solde normalisé : > 0 ⇒ la personne décaisse (verse / doit) ; < 0 ⇒ elle reçoit.
  // En succession, soulte = reçu − part ; en note, on inverse (reçu = « a payé »).
  function aRegler(soulteCents: bigint): bigint {
    return vocab.id === 'note' ? -soulteCents : soulteCents;
  }

  const lignesPaient = $derived(resultat.lignes.filter((l) => !l.estResidu && aRegler(l.soulteCents) > 0n));

  function formatPct(v: number): string {
    return `${(Math.round(v * 100) / 100).toLocaleString('fr-FR')} %`;
  }
  function soldeTexte(soulteCents: bigint): string {
    const v = aRegler(soulteCents);
    if (v > 0n) return `${vocab.verbePaie} ${formatCents(v)}`;
    if (v < 0n) return `${vocab.verbeRecoit} ${formatCents(-v)}`;
    return '—';
  }
</script>

<div class="resultat">
  <h2>Résultat</h2>

  <div class="masse">
    <div><span>{vocab.labelActif}</span><strong>{formatCents(resultat.actifCents)}</strong></div>
    {#if resultat.passifCents > 0n}
      <div><span>− {vocab.sectionPassif}</span><strong>{formatCents(resultat.passifCents)}</strong></div>
    {/if}
    {#if resultat.horsPartCents > 0n}
      <div><span>− Attributions hors part</span><strong>{formatCents(resultat.horsPartCents)}</strong></div>
    {/if}
    <div class="total"><span>= {vocab.labelMasse}</span><strong>{formatCents(resultat.masseCents)}</strong></div>
  </div>

  {#if resultat.avertissements.length > 0}
    <ul class="avertissements">
      {#each resultat.avertissements as a}<li>⚠️ {a}</li>{/each}
    </ul>
  {/if}

  <BarreParts lignes={resultat.lignes} />

  <table class="parts">
    <thead>
      <tr><th>{vocab.labelBeneficiaire}</th><th>Part</th><th class="r">Montant</th><th class="r">{vocab.labelSoulte}</th></tr>
    </thead>
    <tbody>
      {#each resultat.lignes as l (l.id)}
        <tr class:residu={l.estResidu}>
          <td>
            <span class="nom">{l.nom}</span>
            {#if l.biensRecus.length > 0}
              <span class="biens">
                {#each l.biensRecus as b}
                  <span class="chip" class:hors={b.imputation === 'horsPart'}>{b.nom} · {formatCents(b.valeurCents)}{vocab.montreImputation && b.imputation === 'horsPart' ? ' (hors part)' : ''}</span>
                {/each}
              </span>
            {/if}
          </td>
          <td><span class="frac-aff">{l.fraction.toString()}</span><span class="pct">{formatPct(l.pourcent)}</span></td>
          <td class="r">{formatCents(l.montantCents)}</td>
          <td class="r soulte" class:verse={aRegler(l.soulteCents) > 0n} class:recoit={aRegler(l.soulteCents) < 0n}>
            {l.estResidu ? '' : soldeTexte(l.soulteCents)}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if lignesPaient.length > 0}
    <div class="recap">
      <h3>{vocab.recapTitre}</h3>
      <ul>
        {#each lignesPaient as l (l.id)}<li><strong>{l.nom}</strong> {vocab.verbePaie} {formatCents(aRegler(l.soulteCents))}</li>{/each}
      </ul>
      {#if vocab.noteRecap}<p class="aide">{vocab.noteRecap}</p>{/if}
    </div>
  {/if}
</div>
