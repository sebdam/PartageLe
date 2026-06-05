import type { jsPDF as JsPdf } from 'jspdf';
import type { Resultat } from './compute';
import type { Vocabulaire } from './contexte';

/**
 * Export PDF du résultat. jsPDF + autotable sont importés DYNAMIQUEMENT :
 * ils ne pèsent sur le bundle que lorsqu'on clique sur « Exporter en PDF ».
 */

// Format euros « sûr » pour la police PDF (espaces normaux, pas d'espace fine insécable).
function euros(cents: bigint): string {
  const neg = cents < 0n;
  const v = neg ? -cents : cents;
  const e = (v / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const c = (v % 100n).toString().padStart(2, '0');
  return `${neg ? '-' : ''}${e},${c} €`;
}

function pct(p: number): string {
  return `${(Math.round(p * 100) / 100).toLocaleString('fr-FR')} %`;
}

function soldeTexte(soulteCents: bigint, vocab: Vocabulaire): string {
  const v = vocab.id === 'note' ? -soulteCents : soulteCents;
  if (v > 0n) return `${vocab.verbePaie} ${euros(v)}`;
  if (v < 0n) return `${vocab.verbeRecoit} ${euros(-v)}`;
  return '-';
}

function slugify(titre: string): string {
  return (
    titre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'partage'
  );
}

/** Construit le document PDF (sans le télécharger) — testable côté Node. */
export async function construirePdf(resultat: Resultat, vocab: Vocabulaire): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const titre = resultat.titre || vocab.nom;
  let y = 16;

  doc.setFontSize(16);
  doc.text(titre, 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Partage le ! | ${vocab.nom}`, 14, y);
  doc.setTextColor(20);
  y += 8;

  const resume = [`${vocab.labelActif} : ${euros(resultat.actifCents)}`];
  if (resultat.passifCents > 0n) resume.push(`${vocab.sectionPassif} : -${euros(resultat.passifCents)}`);
  resume.push(`${vocab.labelMasse} : ${euros(resultat.masseCents)}`);
  const resumeLines = doc.splitTextToSize(resume.join('     |     '), 182);
  doc.text(resumeLines, 14, y);
  y += 5 * resumeLines.length + 2;

  autoTable(doc, {
    startY: y,
    head: [[vocab.labelBeneficiaire, 'Part', 'Montant', vocab.labelSoulte]],
    body: resultat.lignes.map((l) => [
      l.nom,
      `${l.fraction.toString()}  (${pct(l.pourcent)})`,
      euros(l.montantCents),
      l.estResidu ? '' : soldeTexte(l.soulteCents, vocab),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  const apresTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  y = (apresTable ?? y) + 10;

  if (resultat.reserve) {
    const r = resultat.reserve;
    doc.setFontSize(12);
    doc.text('Réserve héréditaire', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Réserve globale : ${r.reserveGlobale.toString()}     |     Quotité disponible : ${euros(r.quotiteDisponibleCents)}`, 14, y);
    y += 6;
    if (r.alertes.length === 0) {
      doc.setTextColor(4, 120, 87);
      doc.text('Réserve héréditaire respectée.', 14, y);
      y += 6;
    } else {
      doc.setTextColor(180, 83, 9);
      for (const a of r.alertes) {
        const lines = doc.splitTextToSize(`- ${a}`, 182);
        doc.text(lines, 14, y);
        y += 5 * lines.length;
      }
    }
    doc.setTextColor(20);
  }

  doc.setFontSize(8);
  doc.setTextColor(130);
  const pied = `Document indicatif généré par Partage le !${vocab.disclaimer ? ' | ' + vocab.disclaimer : ''}`;
  doc.text(pied, 14, 287);

  return doc;
}

/** Construit puis télécharge le PDF (appelé depuis l'UI). */
export async function exporterPdf(resultat: Resultat, vocab: Vocabulaire): Promise<void> {
  const doc = await construirePdf(resultat, vocab);
  doc.save(`${slugify(resultat.titre || vocab.nom)}.pdf`);
}
