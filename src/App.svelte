<script lang="ts">
  import type { Succession } from './lib/model';
  import { calculer } from './lib/compute';
  import { successionExemple } from './lib/sample';
  import { lireDepuisURL, lienPartage } from './lib/urlState';

  import BiensEditor from './components/BiensEditor.svelte';
  import PassifEditor from './components/PassifEditor.svelte';
  import BeneficiairesEditor from './components/BeneficiairesEditor.svelte';
  import AttributionsEditor from './components/AttributionsEditor.svelte';
  import Resultat from './components/Resultat.svelte';

  // État de l'app : depuis l'URL partagée si présente, sinon l'exemple « fil rouge ».
  let succession = $state<Succession>(lireDepuisURL() ?? successionExemple());

  // Le résultat se recalcule tout seul à chaque modification (réactivité Svelte).
  const resultat = $derived(calculer(succession));

  let copie = $state(false);

  function vide(): Succession {
    return { titre: '', devise: 'EUR', biens: [], passif: [], beneficiaires: [], attributions: [] };
  }

  async function partager() {
    const lien = lienPartage(succession);
    history.replaceState(null, '', lien); // l'adresse reflète l'état partageable
    try {
      await navigator.clipboard.writeText(lien);
      copie = true;
      setTimeout(() => (copie = false), 2000);
    } catch {
      copie = false;
    }
  }
</script>

<header class="entete">
  <div class="bandeau-titre">
    <h1>Partage&nbsp;le&nbsp;!</h1>
    <p class="accroche">Partager équitablement, sans se battre avec les fractions.</p>
  </div>
  <p class="disclaimer">Outil d'aide à la réflexion familiale. <strong>Ne remplace pas un notaire.</strong></p>
</header>

<div class="grille">
  <main class="formulaire">
    <section class="carte">
      <input class="titre" bind:value={succession.titre} placeholder="Titre (ex. Succession de M. X)" />
    </section>

    <section class="carte">
      <h2>Les biens</h2>
      <p class="aide">Pour chaque bien : sa valeur totale et la part possédée par le défunt (seule cette part entre dans la succession).</p>
      <BiensEditor biens={succession.biens} />
    </section>

    <section class="carte">
      <h2>Le passif <span class="opt">(optionnel)</span></h2>
      <PassifEditor passif={succession.passif} />
    </section>

    <section class="carte">
      <h2>Les héritiers</h2>
      <p class="aide">Des personnes et des groupes. Une part s'exprime en fraction, en pourcentage, ou « le reste ».</p>
      <BeneficiairesEditor beneficiaires={succession.beneficiaires} />
    </section>

    <section class="carte">
      <h2>Les attributions <span class="opt">(optionnel)</span></h2>
      <p class="aide">Un bien attribué à quelqu'un. « Sur part » = imputé sur sa part (génère une soulte) ; « hors part » = en plus.</p>
      <AttributionsEditor {succession} />
    </section>

    <section class="actions">
      <button class="primaire" onclick={partager}>{copie ? '✓ Lien copié' : '🔗 Partager le lien'}</button>
      <button onclick={() => (succession = successionExemple())}>Charger l'exemple</button>
      <button onclick={() => (succession = vide())}>Vider</button>
    </section>
  </main>

  <aside class="apercu">
    <Resultat {resultat} />
  </aside>
</div>

<footer class="pied">
  Partage le ! — calcul en fractions exactes, partage par lien, zéro donnée envoyée.
</footer>
