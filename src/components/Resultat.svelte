<script lang="ts">
  import type { Resultat } from '../lib/compute';
  import type { Vocabulaire } from '../lib/contexte';
  import { formatCents } from '../lib/money';
  import { exporterPdf } from '../lib/pdf';
  import { calculerReglements } from '../lib/reglements';
  import BarreParts from './BarreParts.svelte';

  let { resultat, vocab }: { resultat: Resultat; vocab: Vocabulaire } = $props();

  let pdfEnCours = $state(false);
  async function exporter() {
    pdfEnCours = true;
    try {
      await exporterPdf(resultat, vocab);
    } finally {
      pdfEnCours = false;
    }
  }

  // Solde normalisé : > 0 ⇒ la personne décaisse (verse / doit) ; < 0 ⇒ elle reçoit.
  // En succession, soulte = reçu − part ; en note, on inverse (reçu = « a payé »).
  function aRegler(soulteCents: bigint): bigint {
    return vocab.id === 'note' ? -soulteCents : soulteCents;
  }

  const lignesPaient = $derived(resultat.lignes.filter((l) => !l.estResidu && aRegler(l.soulteCents) > 0n));

  // Mode note : plan « qui rembourse qui » (transferts minimisés).
  const reglements = $derived(
    vocab.id === 'note'
      ? calculerReglements(resultat.lignes.filter((l) => !l.estResidu).map((l) => ({ nom: l.nom, soldeCents: -l.soulteCents })))
      : [],
  );

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
  <div class="resultat-tete">
    <h2>Résultat</h2>
    <button class="add petit" onclick={exporter} disabled={pdfEnCours}>{pdfEnCours ? 'Génération…' : '📄 Exporter en PDF'}</button>
  </div>

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

  {#if resultat.reserve}
    {@const r = resultat.reserve}
    <div class="reserve" class:ko={r.alertes.length > 0}>
      <h3>Réserve héréditaire</h3>
      <p class="reserve-chiffres">
        Réserve globale <strong>{r.reserveGlobale.toString()}</strong> ·
        Quotité disponible <strong>{formatCents(r.quotiteDisponibleCents)}</strong>
        <span class="reserve-base">sur {formatCents(r.baseCents)}</span>
      </p>
      <p class="reserve-detail-tete">
        {r.nbEnfants > 0 ? `${r.nbEnfants} réservataire${r.nbEnfants > 1 ? 's' : ''}` : 'Conjoint réservataire'}
        · réserve individuelle <strong>{formatCents(r.seuilCents)}</strong>
      </p>
      {#if r.reservataires.length > 0}
        <div class="table-scroll">
        <table class="reserve-table">
          <thead><tr><th>Réservataire</th><th class="r">Reçu</th><th class="r">Seuil</th><th class="r">Marge</th></tr></thead>
          <tbody>
            {#each r.reservataires as res}
              <tr>
                <td>{res.nom}</td>
                <td class="r">{formatCents(res.recuCents)}</td>
                <td class="r">{formatCents(res.seuilCents)}</td>
                <td class="r" class:negatif={res.margeCents < 0n}>{res.margeCents > 0n ? '+' : ''}{formatCents(res.margeCents)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        </div>
      {/if}
      {#if r.alertes.length > 0}
        <ul class="avertissements">
          {#each r.alertes as a}<li>⚠️ {a}</li>{/each}
        </ul>
      {:else}
        <p class="reserve-ok">✓ La réserve héréditaire semble respectée.</p>
      {/if}
      <p class="reserve-note">Indicatif — une souche compte pour un enfant ; hors libéralités antérieures (rapport).</p>
    </div>
  {/if}

  <BarreParts lignes={resultat.lignes} />

  <div class="table-scroll">
  <table class="parts">
    <thead>
      <tr><th>{vocab.labelBeneficiaire}</th><th>Part</th><th class="r">Montant</th><th class="r">{vocab.labelSoulte}</th></tr>
    </thead>
    <tbody>
      {#each resultat.lignes as l (l.id)}
        <tr class:residu={l.estResidu}>
          <td>
            <span class="nom">{l.nom}</span>
            {#if l.representeDe}<span class="represente">représente {l.representeDe}</span>{/if}
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
  </div>

  {#if vocab.id === 'note'}
    {#if reglements.length > 0}
      <div class="recap">
        <h3>{vocab.recapTitre}</h3>
        <ul>
          {#each reglements as r}<li><strong>{r.deNom}</strong> {vocab.verbePaie} {formatCents(r.montantCents)} à <strong>{r.versNom}</strong></li>{/each}
        </ul>
        <p class="aide">{reglements.length} transfert{reglements.length > 1 ? 's' : ''} pour équilibrer la note.</p>
      </div>
    {/if}
  {:else if lignesPaient.length > 0}
    <div class="recap">
      <h3>{vocab.recapTitre}</h3>
      <ul>
        {#each lignesPaient as l (l.id)}<li><strong>{l.nom}</strong> {vocab.verbePaie} {formatCents(aRegler(l.soulteCents))}</li>{/each}
      </ul>
      {#if vocab.noteRecap}<p class="aide">{vocab.noteRecap}</p>{/if}
    </div>
  {/if}
</div>
