<script lang="ts">
  import type { Partage, Attribution, Droit, Beneficiaire, Membre } from '../lib/model';
  import type { Vocabulaire } from '../lib/contexte';
  import { uid, listerCibles, DROITS, bienDemembrable } from '../lib/model';
  import { pourcentUsufruit } from '../lib/usufruit';
  import { Fraction } from '../lib/fraction';
  import { formatCents, toCents } from '../lib/money';

  let { partage, vocab }: { partage: Partage; vocab: Vocabulaire } = $props();

  const cibles = $derived(listerCibles(partage));
  // Le démembrement (usufruit / nue-propriété) n'a de sens qu'en succession.
  const demembrable = $derived(vocab.montreReserve);

  // Nombre de personnes derrière chaque cible (1 pour une personne, N pour un groupe).
  const tailleCible = $derived.by(() => {
    const map = new Map<string, number>();
    const visit = (node: Beneficiaire | Membre): number => {
      if (node.kind === 'personne') {
        map.set(node.id, 1);
        return 1;
      }
      const k = node.membres.reduce((a, m) => a + visit(m), 0);
      map.set(node.id, k);
      return k;
    };
    partage.beneficiaires.forEach(visit);
    return map;
  });

  function ajouter() {
    partage.attributions.push({
      id: uid('att'),
      bienId: partage.biens[0]?.id ?? '',
      beneficiaireId: cibles[0]?.id ?? '',
      imputation: 'surPart',
      droit: 'pleine',
      fraction: { n: 1, d: 1 },
    });
  }

  // Le démembrement n'a de sens que pour l'immobilier.
  function estImmobilier(att: Attribution): boolean {
    const b = partage.biens.find((x) => x.id === att.bienId);
    return b ? bienDemembrable(b.categorie) : false;
  }
  function setBien(att: Attribution, id: string) {
    att.bienId = id;
    if (!estImmobilier(att)) {
      att.droit = 'pleine';
      att.ageUsufruitier = undefined;
    }
  }

  function setDroit(att: Attribution, v: string) {
    att.droit = v as Droit;
    if (v !== 'pleine' && att.ageUsufruitier == null) att.ageUsufruitier = 70;
  }
  function setFr(att: Attribution, k: 'n' | 'd', v: number) {
    const fr = att.fraction ?? { n: 1, d: 1 };
    att.fraction = { ...fr, [k]: Number.isFinite(v) ? v : k === 'd' ? 1 : 0 };
  }

  function valeurAttribuee(att: Attribution): string {
    const bien = partage.biens.find((b) => b.id === att.bienId);
    if (!bien) return '—';
    const entrante = Fraction.parse(bien.valeurEuros).mul(bien.quotePart.d ? Fraction.ratio(bien.quotePart.n, bien.quotePart.d) : Fraction.zero);
    const fr = att.fraction ?? { n: 1, d: 1 };
    const fracBien = fr.d ? Fraction.ratio(fr.n, fr.d) : Fraction.zero;
    const u = Fraction.ratio(pourcentUsufruit(att.ageUsufruitier ?? 0), 100);
    const droit = estImmobilier(att) ? (att.droit ?? 'pleine') : 'pleine';
    const coeff = droit === 'usufruit' ? u : droit === 'nue' ? Fraction.one.sub(u) : Fraction.one;
    return formatCents(toCents(entrante.mul(fracBien).mul(coeff)));
  }
</script>

<div class="liste">
  {#each partage.attributions as att, i (att.id)}
    <div class="carte-ligne">
      <div class="ligne wrap">
        <select value={att.bienId} onchange={(e) => setBien(att, e.currentTarget.value)}>
          {#each partage.biens as b}<option value={b.id}>{b.nom || '—'}</option>{/each}
        </select>
        <span class="fleche">{vocab.prepositionAttribution}</span>
        <select bind:value={att.beneficiaireId}>
          {#each cibles as c}<option value={c.id}>{c.nom}</option>{/each}
        </select>
        {#if (tailleCible.get(att.beneficiaireId) ?? 1) > 1}<span class="reste-tag">à parts égales</span>{/if}
        {#if vocab.montreImputation}
          <select bind:value={att.imputation}>
            <option value="surPart">{vocab.labelSurPart}</option>
            <option value="horsPart">{vocab.labelHorsPart}</option>
          </select>
        {/if}
        <button class="del" onclick={() => partage.attributions.splice(i, 1)} aria-label="Supprimer">×</button>
      </div>

      {#if demembrable}
        <div class="ligne wrap demembrement">
          {#if estImmobilier(att)}
            <select class="lien" value={att.droit ?? 'pleine'} onchange={(e) => setDroit(att, e.currentTarget.value)} aria-label="Droit transmis">
              {#each DROITS as d}<option value={d.value}>{d.label}</option>{/each}
            </select>
          {/if}
          <label class="champ">
            Part du bien
            <span class="frac">
              <input type="number" min="0" value={att.fraction?.n ?? 1} oninput={(e) => setFr(att, 'n', e.currentTarget.valueAsNumber)} />
              <span>/</span>
              <input type="number" min="1" value={att.fraction?.d ?? 1} oninput={(e) => setFr(att, 'd', e.currentTarget.valueAsNumber)} />
            </span>
          </label>
          {#if estImmobilier(att) && (att.droit ?? 'pleine') !== 'pleine'}
            <label class="champ">
              Âge usufruitier
              <input class="num" type="number" min="0" max="120" bind:value={att.ageUsufruitier} placeholder="ex. 70" />
            </label>
            <span class="entrante">{pourcentUsufruit(att.ageUsufruitier ?? 0)} % d'usufruit</span>
          {/if}
          <span class="entrante">valeur&nbsp;: <strong>{valeurAttribuee(att)}</strong></span>
        </div>
      {/if}
    </div>
  {/each}
</div>

{#if partage.biens.length === 0 || cibles.length === 0}
  <p class="aide">Ajoute au moins un élément et un participant pour pouvoir attribuer.</p>
{:else}
  <button class="add" onclick={ajouter}>+ {vocab.attribuer}</button>
{/if}
