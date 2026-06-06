/**
 * « Qui rembourse qui » (mode note). À partir des soldes nets de chacun
 * (montant > 0 ⇒ doit, < 0 ⇒ on lui doit), calcule un plan de remboursements
 * limitant le nombre de transferts : on apparie le plus gros débiteur au plus
 * gros créancier, puis on recommence. Suppose Σ soldes = 0 (note équilibrée).
 */

export interface Reglement {
  deNom: string;
  versNom: string;
  montantCents: bigint;
}

export function calculerReglements(soldes: { nom: string; soldeCents: bigint }[]): Reglement[] {
  const parReste = (a: { reste: bigint }, b: { reste: bigint }) => (b.reste > a.reste ? 1 : b.reste < a.reste ? -1 : 0);
  const debiteurs = soldes.filter((s) => s.soldeCents > 0n).map((s) => ({ nom: s.nom, reste: s.soldeCents })).sort(parReste);
  const crediteurs = soldes.filter((s) => s.soldeCents < 0n).map((s) => ({ nom: s.nom, reste: -s.soldeCents })).sort(parReste);

  const reglements: Reglement[] = [];
  let i = 0;
  let j = 0;
  while (i < debiteurs.length && j < crediteurs.length) {
    const d = debiteurs[i];
    const c = crediteurs[j];
    const montant = d.reste < c.reste ? d.reste : c.reste;
    if (montant > 0n) reglements.push({ deNom: d.nom, versNom: c.nom, montantCents: montant });
    d.reste -= montant;
    c.reste -= montant;
    if (d.reste === 0n) i++;
    if (c.reste === 0n) j++;
  }
  return reglements;
}
