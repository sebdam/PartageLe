<script lang="ts">
  import type { Partage } from './lib/model';
  import type { Contexte } from './lib/contexte';
  import { partageVide } from './lib/model';
  import { vocabulaire } from './lib/contexte';
  import { calculer } from './lib/compute';
  import { exemple } from './lib/sample';
  import { lireDepuisURL, lienPartage } from './lib/urlState';

  import Landing from './components/Landing.svelte';
  import BiensEditor from './components/BiensEditor.svelte';
  import PassifEditor from './components/PassifEditor.svelte';
  import BeneficiairesEditor from './components/BeneficiairesEditor.svelte';
  import AttributionsEditor from './components/AttributionsEditor.svelte';
  import Resultat from './components/Resultat.svelte';

  // null = on est sur la landing ; sinon on édite un partage (dont le contexte fixe le vocabulaire).
  let partage = $state<Partage | null>(lireDepuisURL());
  let copie = $state(false);

  const vocab = $derived(partage ? vocabulaire(partage.contexte) : null);
  const resultat = $derived(partage ? calculer(partage) : null);

  function choisir(c: Contexte) {
    partage = exemple(c);
  }
  function retourLanding() {
    history.replaceState(null, '', `${location.origin}${location.pathname}`);
    partage = null;
  }
  function chargerExemple() {
    if (partage) partage = exemple(partage.contexte);
  }
  function vider() {
    if (partage) partage = partageVide(partage.contexte);
  }

  async function partager() {
    if (!partage) return;
    const lien = lienPartage(partage);
    history.replaceState(null, '', lien); // l'adresse reflète l'état partageable (contexte inclus)
    try {
      await navigator.clipboard.writeText(lien);
      copie = true;
      setTimeout(() => (copie = false), 2000);
    } catch {
      copie = false;
    }
  }
</script>

{#if !partage || !vocab || !resultat}
  <Landing onChoisir={choisir} />
{:else}
  <header class="entete">
    <div class="bandeau-titre">
      <button class="retour" onclick={retourLanding} title="Changer de partage" aria-label="Changer de partage">←</button>
      <h1>Partage&nbsp;le&nbsp;!</h1>
      <span class="ctx-badge">{vocab.emoji} {vocab.nom}</span>
    </div>
    <p class="accroche">{vocab.accroche}</p>
    {#if vocab.disclaimer}<p class="disclaimer">{vocab.disclaimer}</p>{/if}
  </header>

  <div class="grille">
    <main class="formulaire">
      <section class="carte">
        <input class="titre" bind:value={partage.titre} placeholder={vocab.titrePlaceholder} />
      </section>

      <section class="carte">
        <h2>{vocab.sectionBiens}</h2>
        <p class="aide">{vocab.aideBiens}</p>
        <BiensEditor biens={partage.biens} {vocab} />
      </section>

      {#if vocab.montrePassif}
        <section class="carte">
          <h2>{vocab.sectionPassif} <span class="opt">(optionnel)</span></h2>
          <PassifEditor passif={partage.passif} {vocab} />
        </section>
      {/if}

      <section class="carte">
        <h2>{vocab.sectionBeneficiaires}</h2>
        <p class="aide">{vocab.aideBeneficiaires}</p>
        <BeneficiairesEditor beneficiaires={partage.beneficiaires} {vocab} />
      </section>

      <section class="carte">
        <h2>{vocab.sectionAttributions} <span class="opt">(optionnel)</span></h2>
        <p class="aide">{vocab.aideAttributions}</p>
        <AttributionsEditor {partage} {vocab} />
      </section>

      <section class="actions">
        <button class="primaire" onclick={partager}>{copie ? '✓ Lien copié' : '🔗 Partager le lien'}</button>
        <button onclick={chargerExemple}>Charger l'exemple</button>
        <button onclick={vider}>Vider</button>
      </section>
    </main>

    <aside class="apercu">
      <Resultat {resultat} {vocab} />
    </aside>
  </div>

  <footer class="pied">
    Partage le ! — calcul en fractions exactes, partage par lien, zéro donnée envoyée.
  </footer>
{/if}
