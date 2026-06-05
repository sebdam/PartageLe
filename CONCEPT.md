# Partage le ! — Concept

> Partager équitablement, sans se battre avec les fractions.

## Le problème

Personne n'est vraiment à l'aise avec les fractions. Dès qu'il faut partager —
surtout une succession — ça devient compliqué, source de malentendus et de
tensions. « Un quart », oui, mais **un quart de quoi ?**

## La promesse

Une app web très simple et fluide : tu décris **ce que tu partages** et
**avec qui / pour quelle part**, et tu obtiens une **vue claire des parts de
chacun** — en fractions, en pourcentages et en euros.

## Positionnement

**La succession en héros.** C'est le cas le plus douloureux, le plus mal
outillé, et 100 % fractions. Le moteur reste générique (il pourra servir au
resto, au loyer, à une cagnotte…), mais l'app, son vocabulaire et ses modèles
pré-remplis parlent **succession**.

> ⚠️ Outil d'aide à la réflexion familiale. **Ne remplace pas un notaire.**
> Aucune validation juridique (réserve héréditaire, etc.) en v1.

## Principes clés

- **Un arbre de parts.** Chaque part s'exprime *par rapport à son contenant*.
  C'est ce qui tue l'ambiguïté « un quart de quoi ? ».
- **Le groupe est un objet de premier rang.** « Les 9 enfants » = un groupe qui
  a *une* part (ex. « le reste »), répartie à parts égales (pondération possible).
- **« Le reste » se calcule tout seul.** Plusieurs « reste » au même niveau → le
  reliquat est partagé entre eux, explicitement.
- **Maths exactes.** Fractions entières (numérateur / dénominateur), jamais de
  flottants. Une app sur les fractions ne doit jamais afficher `0.30000004`.
- **Arrondi des centimes maîtrisé.** Le dernier centime est attribué de façon
  déterministe (méthode des plus forts restes) pour que la somme tombe *pile*
  sur le total.
- **On montre la preuve.** `1/4 × 1/2 = 1/8`, « total = 100 % ✓ ». La confiance
  est essentielle quand il y a de l'argent et de l'émotion en jeu.
- **Zéro backend.** L'état est encodé dans l'URL → on « partage le ! » en
  envoyant un lien.

## Le modèle « succession multi-actifs »

Le « tout » n'est pas un nombre, c'est un **calcul**.

### Les biens (actif)

Chaque bien : nom, catégorie (immobilier, compte, véhicule, mobilier, parts de
société…), **valeur totale**, et **quote-part du défunt**. Seule la quote-part
entre dans la succession — c'est ainsi qu'on modèle « la moitié d'une maison »,
sans deviner le régime matrimonial (on demande directement la part possédée).

### Le passif (optionnel)

Dettes, frais → soustraits de l'actif.

### Les bénéficiaires

Personnes et **groupes**. Un groupe a des membres et une répartition interne
(égale par défaut, pondérable).

### Les attributions spécifiques

Un bien (ou une somme) qui va à quelqu'un en particulier :

- **Sur part (rapportable)** — compté comme une avance sur sa part → génère une
  soulte. *(défaut équitable)*
- **Hors part (préciput)** — un « plus », retiré de la masse avant le partage.

### Le partage du reste

Les règles de parts appliquées au résidu : fraction, pourcentage, « le reste »,
groupes, **représentation** (un héritier décédé remplacé par ses propres enfants).

### Modèle de données (esquisse)

```
Succession
  titre, date?, devise
  biens[]        : { id, nom, categorie, valeurTotale, quotePartDefunt: Fraction }
  passif[]       : { id, libelle, montant }
  beneficiaires[]: Personne | Groupe
        Personne : { id, nom }
        Groupe   : { id, nom, membres[], repartition: 'egale' | 'ponderee', poids? }
  partage[]      : { cibleId, type: 'fraction'|'pourcent'|'reste'|'montant',
                     valeur?, referentiel: 'parent' | 'global' }
  attributions[] : { bienId | montant, beneficiaireId, imputation: 'surPart' | 'horsPart' }
```

## Pipeline de calcul

1. **Actif** = Σ (valeur du bien × quote-part du défunt)
2. **Masse nette** = actif − passif − attributions *hors part*
3. **Parts théoriques** via l'arbre (fractions exactes, Σ = 100 %)
4. **Soulte** par personne = (reçu en nature *sur part*) − (part théorique en €)
   - positif → la personne **verse** ; négatif → elle **reçoit**
5. **Arrondi** des centimes (plus forts restes) pour que la somme = la masse
6. **Résultat** par personne : fraction · % · € · biens reçus · soulte

### Exemple complet

```
Succession de M. X
ACTIF
  🏠 Maison    360 000 €  × quote-part 1/2  →  180 000 €
  🚗 Voiture    24 000 €  × 1/1             →   24 000 €
  🏦 Compte     36 000 €  × 1/1             →   36 000 €
PASSIF                                          0 €
──────────────────────────────────────────────────
MASSE À PARTAGER                             240 000 €

PARTAGE DU RESTE
  Madame Y ………………………… 1/4              →  60 000 €
  Les 9 enfants … le reste, à parts égales  →  20 000 € chacun
       (un enfant décédé → ses 2 enfants : 10 000 € chacun)

ATTRIBUTION
  🚗 Voiture (24 000 €) → Paul (sur part)
     part théorique 20 000 € → Paul VERSE une soulte de 4 000 €
```

Vérif : 60 000 + 9 × 20 000 = 240 000 ✓ — les soultes versées par les
sur-servis financent les sous-servis. Ça boucle toujours.

## Parcours (formulaire guidé)

1. **Le défunt & le contexte** — « La succession de M. X » + bandeau notaire.
2. **Les biens** — valeur + quote-part + catégorie.
3. **Le passif** *(optionnel)*.
4. **Les héritiers** — personnes et groupes.
5. **Les attributions spécifiques** *(optionnel)* — bien → personne, sur/hors part.
6. **Le partage du reste** — fractions, « le reste », représentation.
7. **Le résultat** — tableau, barre empilée, récap « qui verse quoi à qui », lien.

## Vue résultat

- **Tableau** par personne : fraction · % · € · biens reçus · soulte (verse/reçoit).
- **Barre empilée segmentée** (les sous-parts apparaissent dans le segment du parent).
- **Récap des soultes** : qui verse combien à qui.
- **Garde-fous live** : « il reste 10 % non attribués » / « tu dépasses 100 % ».
- **Lien partageable** (état encodé dans l'URL).

## Périmètre

### v1 (MVP)

- Formulaire guidé complet (biens + quote-part, passif optionnel, bénéficiaires
  & groupes, attributions sur/hors part, partage du reste avec représentation).
- Calcul : masse, parts exactes, **soulte**, arrondi juste au centime.
- Vue résultat (tableau, barre empilée, récap soultes) + lien partageable.
- Bandeau « ne remplace pas un notaire ».

### Plus tard (v2+)

- Export PDF (réunion de famille / notaire).
- Saisie en **langage naturel** (IA) qui pré-remplit le formulaire.
- Couche **réserve héréditaire / quotité disponible** (alertes).
- Indivision explicite, liquidité, financement des soultes.
- Comptes, sauvegarde, collaboration temps réel.
- Autres cas d'usage (resto, coloc, cagnotte) sur le même moteur.

## Stack technique

- **SPA légère** : Svelte ou React + Vite, **TypeScript**.
- **Arithmétique rationnelle exacte** (fractions entières, réduction par PGCD).
- **État dans l'URL** (encodage compact), **zéro backend**.
- **Mobile-first**, hébergement statique (Vercel / Netlify / GitHub Pages).

---

*Document de cadrage — amendable. Prochaine étape : MVP.*
