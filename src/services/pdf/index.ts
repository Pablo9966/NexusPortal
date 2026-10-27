/**
 * PDF-Erzeugung im Browser (jsPDF).
 * In der Zielumgebung liefert das CDI das Offert-PDF. Die Struktur hier dient als Vorlage.
 */
import { jsPDF } from 'jspdf';
import {
  ADVISORS,
  CONTRACT_DURATION_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  UNDERWRITING_PROCESSING_DAYS,
  UNDERWRITING_REASON_LABELS,
  UVG_MAX_SALARY,
} from '@/domain/constants';
import { findNoga, RISK_CLASS_LABELS } from '@/domain/noga';
import { describeKtg, describeUvgz, groupConfig, groupEmployees, groupSalary, groupSplit, totals } from '@/domain/rules';
import type { Advisor, Offer } from '@/domain/types';
import { chf, date, fileSize, num, yesNo } from '@/lib/format';

const RED: [number, number, number] = [216, 32, 52];
const INK: [number, number, number] = [20, 20, 20];
const GRAY: [number, number, number] = [128, 128, 128];
const LIGHT: [number, number, number] = [218, 218, 218];
const SURFACE: [number, number, number] = [246, 245, 243];

const M = 20; // Seitenrand in mm
const LINE = 5.2;

let logoCache: Promise<{ data: string; ratio: number } | null> | null = null;

function loadLogo() {
  if (!logoCache) {
    logoCache = fetch(`${import.meta.env.BASE_URL}swisslife-logo.png`)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then(
        (blob) =>
          new Promise<{ data: string; ratio: number }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => resolve({ data: reader.result as string, ratio: img.width / img.height });
              img.onerror = reject;
              img.src = reader.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      )
      .catch(() => null);
  }
  return logoCache;
}

export function resolveAdvisor(offer: Offer, advisorId: string): Advisor | undefined {
  return offer.customerData.customAdvisors.find((a) => a.id === advisorId) ?? ADVISORS.find((a) => a.id === advisorId);
}

class DocBuilder {
  doc = new jsPDF({ unit: 'mm', format: 'a4' });
  y = 0;
  readonly w = this.doc.internal.pageSize.getWidth();
  readonly h = this.doc.internal.pageSize.getHeight();
  readonly cw = this.w - 2 * M;

  constructor(
    private title: string,
    private subtitle: string,
    private footerNote: string,
    private logo: { data: string; ratio: number } | null,
  ) {
    this.header();
  }

  private header() {
    const { doc } = this;
    doc.setFillColor(...RED);
    doc.rect(0, 0, 6, 34, 'F');
    if (this.logo) {
      const lw = 30;
      doc.addImage(this.logo.data, 'PNG', this.w - M - lw, 10, lw, lw / this.logo.ratio);
    } else {
      doc.setFont('times', 'bold').setFontSize(16).setTextColor(...RED).text('Swiss Life', this.w - M, 18, { align: 'right' });
    }
    doc.setFont('times', 'bold').setFontSize(22).setTextColor(...INK).text(this.title, M, 22);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...GRAY).text(this.subtitle, M, 29);
    doc.setDrawColor(...RED).setLineWidth(0.6).line(M, 36, this.w - M, 36);
    this.y = 46;
  }

  ensure(space: number) {
    if (this.y + space > this.h - 22) {
      this.doc.addPage();
      this.y = 22;
    }
  }

  section(title: string) {
    this.ensure(16);
    this.y += 3;
    this.doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...RED).text(title.toUpperCase(), M, this.y, { charSpace: 0.4 });
    this.y += 2.5;
    this.doc.setDrawColor(...LIGHT).setLineWidth(0.2).line(M, this.y, this.w - M, this.y);
    this.y += 5;
  }

  rows(items: [string, string][], labelWidth = 52) {
    for (const [label, value] of items) {
      const lines = this.doc.splitTextToSize(value || '-', this.cw - labelWidth);
      this.ensure(lines.length * LINE);
      this.doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...GRAY).text(label, M, this.y);
      this.doc.setTextColor(...INK).text(lines, M + labelWidth, this.y);
      this.y += lines.length * LINE;
    }
  }

  paragraph(text: string, size = 9.5, color: [number, number, number] = INK, style: 'normal' | 'bold' = 'normal') {
    const lines = this.doc.splitTextToSize(text, this.cw);
    this.ensure(lines.length * LINE);
    this.doc.setFont('helvetica', style).setFontSize(size).setTextColor(...color).text(lines, M, this.y);
    this.y += lines.length * (size * 0.5) + 1.5;
  }

  subheading(text: string) {
    this.ensure(10);
    this.y += 1;
    this.doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK).text(text, M, this.y);
    this.y += LINE;
  }

  callout(title: string, lines: string[], color: [number, number, number]) {
    const body = lines.flatMap((l) => this.doc.splitTextToSize(l, this.cw - 12));
    const height = 10 + body.length * LINE;
    this.ensure(height + 4);
    this.doc.setFillColor(...SURFACE).rect(M, this.y - 4, this.cw, height, 'F');
    this.doc.setFillColor(...color).rect(M, this.y - 4, 1.4, height, 'F');
    this.doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK).text(title, M + 6, this.y + 1.5);
    this.doc.setFont('helvetica', 'normal').setFontSize(9.5).text(body, M + 6, this.y + 1.5 + LINE);
    this.y += height + 3;
  }

  priceTable(rows: [string, string, number][], total: number, perYearLabel: string) {
    this.ensure(14 + rows.length * 8 + 16);
    const x2 = this.w - M;
    this.doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...GRAY);
    this.doc.text('PRODUKT', M, this.y);
    this.doc.text('DECKUNG', M + 62, this.y);
    this.doc.text(perYearLabel, x2, this.y, { align: 'right' });
    this.y += 2.5;
    this.doc.setDrawColor(...LIGHT).line(M, this.y, x2, this.y);
    this.y += 5.5;
    for (const [product, detail, amount] of rows) {
      const lines = this.doc.splitTextToSize(detail, 80);
      this.doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK).text(product, M, this.y);
      this.doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRAY).text(lines, M + 62, this.y);
      this.doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK).text(chf(amount, 2), x2, this.y, { align: 'right' });
      this.y += Math.max(1, lines.length) * 4.6 + 2.5;
      this.doc.setDrawColor(...LIGHT).line(M, this.y - 3, x2, this.y - 3);
    }
    this.y += 2;
    this.doc.setFillColor(...RED).rect(M, this.y - 5.5, this.cw, 12, 'F');
    this.doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(255, 255, 255);
    this.doc.text('Jahresprämie total', M + 5, this.y + 1.8);
    this.doc.text(chf(total, 2), x2 - 5, this.y + 1.8, { align: 'right' });
    this.y += 13;
  }

  signatures(left: string, right: string) {
    this.ensure(40);
    this.y += 8;
    const half = this.cw / 2;
    this.doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRAY);
    this.doc.text('Ort, Datum', M, this.y);
    this.doc.setDrawColor(...INK).setLineWidth(0.3).line(M + 22, this.y, M + half - 8, this.y);
    this.y += 18;
    this.doc.line(M, this.y, M + half - 8, this.y);
    this.doc.line(M + half + 8, this.y, this.w - M, this.y);
    this.y += 4.5;
    this.doc.text(left, M, this.y);
    this.doc.text(right, M + half + 8, this.y);
    this.y += 6;
  }

  finish(): jsPDF {
    const pages = this.doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      this.doc.setPage(i);
      this.doc.setDrawColor(...LIGHT).setLineWidth(0.2).line(M, this.h - 14, this.w - M, this.h - 14);
      this.doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRAY);
      this.doc.text(this.footerNote, M, this.h - 9);
      this.doc.text(`Seite ${i} von ${pages}`, this.w - M, this.h - 9, { align: 'right' });
    }
    return this.doc;
  }
}

const FOOTER = 'Swiss Life AG · Personenversicherung';

function customerRows(offer: Offer): [string, string][] {
  const c = offer.customerData;
  const noga = findNoga(c.nogaCode);
  return [
    ['Firma', c.companyName],
    ['UID-Nummer', c.uidNumber],
    ['Branche', c.industry],
    ['NOGA-Code', noga ? `${noga.code} ${noga.label} · ${RISK_CLASS_LABELS[noga.riskClass]}` : c.nogaCode],
    ['Kontaktperson', c.contactPerson],
    ['E-Mail / Telefon', `${c.email} · ${c.phone}`],
    ['Adresse', `${c.address}, ${c.postalCode} ${c.city}`],
  ];
}

function advisorRows(offer: Offer): [string, string][] {
  return offer.customerData.advisors.map((a, i) => {
    const adv = resolveAdvisor(offer, a.advisorId);
    const split = offer.customerData.advisors.length > 1 ? ` · ${a.splitPercent} %` : '';
    return [i === 0 ? 'Kundenberater' : '', adv ? `${adv.name} (${adv.maNumber}), ${adv.location}${split}` : '-'];
  });
}

function contractRows(offer: Offer): [string, string][] {
  const k = offer.contractDetails;
  return [
    ['Vertragsstart', date(k.startDate)],
    ['Zahlungsfrequenz', PAYMENT_FREQUENCY_LABELS[k.paymentFrequency] ?? '-'],
    ['Vertragsdauer', CONTRACT_DURATION_LABELS[k.contractDuration] ?? '-'],
  ];
}

function writeGroups(b: DocBuilder, offer: Offer) {
  for (const g of offer.personGroups) {
    const split = groupSplit(g);
    b.subheading(g.name || 'Unbenannte Gruppe');
    const rows: [string, string][] = g.isNamedInsured
      ? [
          ['Namentlich versichert', `${g.namedPersonName} (${g.namedInsuredType === 'betriebsinhaber' ? 'Betriebsinhaber' : 'Mitarbeitende Familienmitglieder'}, ${g.namedInsuredGender === 'female' ? 'Frau' : 'Mann'})`],
          ['Lohnsumme', chf(groupSalary(g))],
        ]
      : [
          ['Männer', `${num(g.maleEmployees)} Personen · ${chf(g.maleSalary)}`],
          ['Frauen', `${num(g.femaleEmployees)} Personen · ${chf(g.femaleSalary)}`],
          ['Total', `${num(groupEmployees(g))} Personen · ${chf(groupSalary(g))}`],
        ];
    rows.push(['Obligatorisch / Überschuss', `${chf(split.obligatory)} / ${chf(split.excess)}`]);
    b.rows(rows);
  }
  const t = totals(offer.personGroups);
  b.y += 1;
  b.rows([['Gesamtlohnsumme', `${num(t.employees)} Personen · ${chf(t.salary)}`]]);
}

function writeQuestions(b: DocBuilder, offer: Offer) {
  const q = offer.applicationQuestions;
  b.rows([
    ['1. Bestehende Vers.', `KTG/VVG ${yesNo(q.hasExistingKtgVvg)} · UVG ${yesNo(q.hasExistingUvg)} · UVGZ/VVG ${yesNo(q.hasExistingUvgzVvg)}`],
    ...(q.existingInsuranceCompany ? ([['Vorversicherer', `${q.existingInsuranceCompany}${q.existingPolicyNumber ? ` (${q.existingPolicyNumber})` : ''}`]] as [string, string][]) : []),
    ['2. Schäden 5 Jahre', q.hasPreviousClaims ? `Ja · ${chf(q.claimAmount)}` : yesNo(q.hasPreviousClaims)],
    ...(q.akdFile ? ([['AKD-File', `${q.akdFile.name} (${fileSize(q.akdFile.size)})`]] as [string, string][]) : []),
    ['3. Ablehnung', q.hasInsuranceRejection ? `Ja${q.rejectionDetails ? ` · ${q.rejectionDetails}` : ''}` : yesNo(q.hasInsuranceRejection)],
    [
      '4. Gesundheit',
      `Chronisch ${yesNo(q.hasChronicIllness)} · Arbeitsunfähig ${yesNo(q.hasCurrentIncapacity)} · Längere AU ${yesNo(q.hasLongTermIllness)} · Invalid ${yesNo(q.hasDisabledPersons)}`,
    ],
    ...(q.healthConditionDetails ? ([['Details Gesundheit', q.healthConditionDetails]] as [string, string][]) : []),
  ]);
}

function writeCoverage(b: DocBuilder, offer: Offer) {
  const sel = offer.selectedProducts;
  const perGroup = offer.productConfig.perGroupConfig && offer.personGroups.length > 1;
  const groups = perGroup ? offer.personGroups : [offer.personGroups[0]];
  b.rows([['SUVA-unterstellt', yesNo(offer.isSuvaAffiliated)]]);
  for (const g of groups) {
    const gc = groupConfig(offer.productConfig, g.id, sel);
    if (perGroup) b.subheading(`Personengruppe: ${g.name}`);
    if (sel.uvg) b.rows([['UVGO & UVGF', gc.products.uvg ? `Obligatorische Unfallversicherung, max. ${chf(UVG_MAX_SALARY)} pro Person` : 'Ausgeschlossen']]);
    if (sel.uvgz) b.rows(gc.products.uvgz ? describeUvgz(gc.uvgz).map((r, i) => [i === 0 ? `UVGZ · ${r.label}` : r.label, r.value] as [string, string]) : [['UVGZ', 'Ausgeschlossen']]);
    if (sel.ktg) b.rows(gc.products.ktg ? describeKtg(gc.ktg).map((r, i) => [i === 0 ? `KTG · ${r.label}` : r.label, r.value] as [string, string]) : [['KTG', 'Ausgeschlossen']]);
  }
}

function slug(s: string) {
  return (s || 'Firma').replace(/[^\wäöüÄÖÜ-]+/g, '_');
}

/** Offerte (mit Preis) oder Offertanfrage zur Prüfung (ohne Preis). */
export async function buildOfferPdf(offer: Offer): Promise<{ doc: jsPDF; filename: string }> {
  const logo = await loadLogo();
  const cdi = offer.cdi;
  const priced = !!cdi?.premiums;
  const created = cdi?.calculatedAt ?? new Date().toISOString();
  const validUntil = new Date(new Date(created).getTime() + 30 * 86_400_000).toISOString();
  const b = new DocBuilder(
    priced ? 'Offerte Personenversicherung' : 'Offertanfrage zur Prüfung',
    `${cdi?.offerNumber ?? 'Entwurf'} · ${offer.customerData.companyName} · ${date(created)}`,
    FOOTER,
    logo,
  );

  b.rows([
    ['Offertnummer', cdi?.offerNumber ?? '-'],
    ['Erstellt am', date(created)],
    ...(priced ? ([['Gültig bis', date(validUntil)]] as [string, string][]) : []),
    ...advisorRows(offer),
  ]);

  if (priced && cdi?.premiums) {
    const p = cdi.premiums;
    b.section('Ihre Prämie');
    const rows: [string, string, number][] = [];
    if (offer.selectedProducts.uvg) rows.push(['UVGO & UVGF', 'Obligatorische Unfallversicherung (BU & NBU)', p.uvg]);
    if (offer.selectedProducts.uvgz) rows.push(['UVGZ', 'Unfall-Zusatzversicherung gemäss Deckungsübersicht', p.uvgz]);
    if (offer.selectedProducts.ktg) rows.push(['KTG', 'Krankentaggeld gemäss Deckungsübersicht', p.ktg]);
    b.priceTable(rows, p.total, 'CHF / JAHR');
    if (p.perGroup.length > 1) {
      b.rows(p.perGroup.map((g) => [g.groupName, chf(g.total, 2)] as [string, string]));
    }
    const freq = offer.contractDetails.paymentFrequency;
    if (freq === 'semi-annual') b.paragraph(`Zahlbar halbjährlich: 2 × ${chf(p.total / 2, 2)}.`, 9, GRAY);
    b.paragraph(`Berechnet im CDI am ${date(created)}. Die Prämie gilt für die unten aufgeführten Personen, Löhne und Deckungen.`, 8.5, GRAY);
  } else {
    b.y += 2;
    b.callout(
      'Underwriting erforderlich',
      [
        'Diese Anfrage wird durch unser Underwriting geprüft. Die Prämie wird danach im CDI berechnet und mit der Offerte zugestellt.',
        ...(cdi?.underwritingReasons ?? []).map((r) => `· ${UNDERWRITING_REASON_LABELS[r]}`),
        `Geschätzte Bearbeitungszeit: ca. ${UNDERWRITING_PROCESSING_DAYS} Tage.`,
      ],
      [252, 197, 45],
    );
  }

  b.section('Versicherungsnehmer');
  b.rows(customerRows(offer));
  b.section('Vertrag');
  b.rows(contractRows(offer));
  b.section('Versicherte Personen');
  writeGroups(b, offer);
  b.section('Deckungsübersicht');
  writeCoverage(b, offer);
  b.section('Antragsfragen');
  writeQuestions(b, offer);

  if (priced) {
    b.section('Annahme der Offerte');
    b.paragraph('Mit der Unterschrift beantragt der Versicherungsnehmer den Abschluss gemäss dieser Offerte. Die Police wird nach Eingang des unterzeichneten Dokuments ausgestellt.', 9, INK);
    const adv = resolveAdvisor(offer, offer.customerData.advisors[0]?.advisorId ?? '');
    b.signatures(`Versicherungsnehmer: ${offer.customerData.companyName}`, `Kundenberater: ${adv?.name ?? ''}`);
  }

  const kind = priced ? 'Offerte' : 'Offertanfrage';
  return { doc: b.finish(), filename: `${kind}_${slug(offer.customerData.companyName)}_${cdi?.offerNumber ?? 'Entwurf'}.pdf` };
}

/** Antragsformular: alle erfassten Angaben, ohne Preis. */
export async function buildApplicationPdf(offer: Offer): Promise<{ doc: jsPDF; filename: string }> {
  const logo = await loadLogo();
  const b = new DocBuilder('Antragsformular', `${offer.cdi?.offerNumber ?? offer.id} · ${offer.customerData.companyName}`, FOOTER, logo);
  b.rows([['Status', offer.status], ['Erstellt', date(offer.createdAt)], ...advisorRows(offer)]);
  b.section('Versicherungsnehmer');
  b.rows(customerRows(offer));
  b.section('Vertrag');
  b.rows(contractRows(offer));
  b.section('Versicherte Personen');
  writeGroups(b, offer);
  b.section('Antragsfragen');
  writeQuestions(b, offer);
  b.section('Gewünschte Deckungen');
  writeCoverage(b, offer);
  return { doc: b.finish(), filename: `Antrag_${slug(offer.customerData.companyName)}.pdf` };
}

/** Dummy-Police für abgeschlossene Offerten. */
export async function buildPolicyPdf(offer: Offer): Promise<{ doc: jsPDF; filename: string }> {
  const logo = await loadLogo();
  const policyNo = (offer.cdi?.offerNumber ?? offer.id).replace('OFF', 'POL');
  const b = new DocBuilder('Versicherungspolice', `${policyNo} · ${offer.customerData.companyName}`, FOOTER, logo);
  b.rows([['Policennummer', policyNo], ['Vertragsbeginn', date(offer.contractDetails.startDate)], ['Vertragsdauer', CONTRACT_DURATION_LABELS[offer.contractDetails.contractDuration] ?? '-']]);
  b.section('Versicherungsnehmer');
  b.rows(customerRows(offer));
  b.section('Versicherte Produkte und Deckungen');
  writeCoverage(b, offer);
  if (offer.cdi?.premiums) {
    b.section('Prämie');
    b.rows([['Jahresprämie', chf(offer.cdi.premiums.total, 2)]]);
  }
  return { doc: b.finish(), filename: `Police_${slug(offer.customerData.companyName)}.pdf` };
}

/** Dummy-Rechnung für eine Periode. */
export async function buildInvoicePdf(offer: Offer, period: string): Promise<{ doc: jsPDF; filename: string }> {
  const logo = await loadLogo();
  const p = offer.cdi?.premiums;
  const divisor = offer.contractDetails.paymentFrequency === 'semi-annual' ? 2 : 1;
  const b = new DocBuilder('Prämienrechnung', `${period} · ${offer.customerData.companyName}`, FOOTER, logo);
  b.rows([['Rechnungsperiode', period], ['Rechnungsdatum', date(new Date().toISOString())], ['Zahlbar bis', '30 Tage netto']]);
  b.section('Positionen');
  const rows: [string, string, number][] = [];
  if (p && offer.selectedProducts.uvg) rows.push(['UVGO & UVGF', period, p.uvg / divisor]);
  if (p && offer.selectedProducts.uvgz) rows.push(['UVGZ', period, p.uvgz / divisor]);
  if (p && offer.selectedProducts.ktg) rows.push(['KTG', period, p.ktg / divisor]);
  b.priceTable(rows, (p?.total ?? 0) / divisor, 'CHF');
  return { doc: b.finish(), filename: `Rechnung_${slug(offer.customerData.companyName)}_${slug(period)}.pdf` };
}

export function pdfBlobUrl(doc: jsPDF): string {
  return URL.createObjectURL(doc.output('blob'));
}
