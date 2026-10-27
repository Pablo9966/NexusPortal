# 03 · Plan Neuentwicklung

## 1. Ziel

Den Figma-Prototyp als sauberes, wartbares React-Projekt neu bauen. Er dient als **Referenzimplementierung** für die spätere Entwicklung in der elipsLife/Swiss Life Umgebung. Backend und Security sind ausgeklammert und werden durch klar abgegrenzte Mock-Services ersetzt, die später gegen echte Schnittstellen (CDI, SSO, Mail) getauscht werden.

## 2. Getroffene Entscheidungen

| Thema | Entscheid |
|---|---|
| Stack | React 18, TypeScript (strict), Vite, Tailwind CSS, React Router, Zustand |
| Validierung | Zod-Schemas pro Schritt (eine Quelle der Wahrheit für Regeln und Fehlermeldungen) |
| Persistenz | `sessionStorage` über Zustand `persist` (nur laufende Session) |
| Berechnung | Ausschliesslich im **CDI-Mock** (`src/services/cdi`). UI zeigt nie Preise vor der Übermittlung |
| Underwriting | Lohnsumme > CHF 500'000, Antragsfrage 3 = Ja, Antragsfrage 4 = Ja. Schaden löst kein UW mehr aus |
| Tarifübernahme | Entfällt |
| AKD-File | Bleibt, echter Datei-Upload (Name, Grösse, Typ in der Session) |
| ZEFIX | Echte Anbindung an die öffentliche ZEFIX-Suche (Name oder UID, Adresse). Fallback auf Testdaten, wenn nicht erreichbar |
| FAQ-Chatbot | Ersetzt durch Kontaktformular per E-Mail (mailto mit Offert-Kontext) |
| Statusmodell | Original-Status (`created`, `processing`, `underwriting`, `contracted`, `declined`) |
| Wiederverwendung | Entwurf fortsetzen, übermittelte Offerte ansehen und PDF erneut laden, Offerte duplizieren |
| Dashboard | KPIs und Diagramme bleiben |
| Detailansicht | Bleibt mit Dokumenten (Offerte, Antragsformular, Police und Rechnungen als Dummy) |
| Design | Swiss Life Corporate Design (Rot #D82034, Bordeaux #A11C36, Grautöne, viel Weissraum), modern und hochwertig umgesetzt |

## 3. Architektur

```
src/
├── app/                 Router, Layout, Providers
├── pages/               Login, Dashboard, Wizard, Ergebnis, Detail
├── features/
│   ├── wizard/steps/    Ein Ordner je Schritt (UI + Zod-Schema)
│   ├── dashboard/       KPIs, Charts, Tabelle, Filter
│   ├── offer-detail/    Detailansicht, Dokumente
│   └── contact/         Kontaktformular E-Mail
├── domain/              Typen, Konstanten, Regeln (UW, Lohnaufteilung, Empfehlung), NOGA-Daten
├── services/
│   ├── cdi/             CDI-Mock: submitOffer(), Tarif-Formeln, Underwriting-Entscheid
│   ├── zefix/           ZEFIX-Client (echt) + Fallback
│   ├── pdf/             PDF-Erzeugung (Offerte, Offertanfrage, Antrag, Police, Rechnung)
│   └── mail/            mailto-Builder
├── store/               Zustand-Store (Offerten, Session, Wizard-Arbeitskopie)
└── components/ui/       Button, Card, Field, Select, Toggle, Badge, Dialog ...
```

### Schnittstellen-Grenzen (für die echte Umgebung)

| Service | Prototyp | Ziel-Umgebung |
|---|---|---|
| `auth` | SSO-Button setzt Session-Flag | Azure AD / Swiss Life SSO (OIDC) |
| `cdi.submitOffer(payload)` | Lokale Berechnung mit Dummy-Tarif, 2 bis 3 s Latenz | REST/SOAP-Aufruf ans CDI, liefert Offertnummer, Prämien, PDF |
| `pdf` | jsPDF im Browser | PDF kommt vom CDI (Dokumentenerstellung im Backend) |
| `zefix` | Öffentliche Suche von zefix.ch direkt aus dem Browser | Offizielle **ZEFIX Public REST API** (mit Zugangsdaten) über ein eigenes Backend |
| `mail` | mailto-Link | Mail-Service im Backend |
| Speicher | sessionStorage | Offert-Datenbank / CDI |

**Hinweis ZEFIX:** Die im Prototyp genutzte Schnittstelle ist die Such-API, die auch die Website zefix.ch verwendet. Sie ist frei zugänglich, aber nicht als offizielle Schnittstelle dokumentiert und kann sich ohne Ankündigung ändern. Für die Produktion ist die offizielle ZEFIX Public REST API (Zugang beim Eidgenössischen Amt für das Handelsregister beantragen) über das Backend vorgesehen.

### Payload an das CDI (Entwurf)

```ts
interface CdiOfferRequest {
  offerId: string;
  customer: { companyName; uid; industry; nogaCode; contactPerson; email; phone; address; postalCode; city };
  advisors: { maNumber; name; splitPercent }[];
  contract: { startDate; paymentFrequency; contractDuration };
  personGroups: PersonGroup[];            // inkl. obligatorisch/Überschuss je Gruppe
  questions: ApplicationQuestions;        // inkl. AKD-File-Metadaten
  isSuvaAffiliated: boolean;
  products: { uvg; uvgz; ktg };
  coverage: ProductConfig;                // global oder pro Gruppe
  underwritingFlags: UnderwritingReason[];// Hinweis, CDI entscheidet verbindlich
}

interface CdiOfferResponse {
  offerNumber: string;                    // z.B. OFF-2026-000123
  status: 'processing' | 'underwriting';
  premiums?: { uvg; uvgz; ktg; total; perGroup[] };  // nur ohne UW
  underwritingReasons?: UnderwritingReason[];
  calculatedAt: string;
}
```

## 4. Behobene Mängel aus der Analyse

| # | Massnahme |
|---|---|
| M1 | Branche und NOGA-Code werden validiert |
| M2 | Jede Gruppe braucht mind. 1 Person und eine Lohnsumme > 0 |
| M3 | «Verwerfen» löscht neue Entwürfe bzw. stellt den letzten Stand wieder her |
| M4 | Neu erfasste Berater werden in der Offerte gespeichert und überall angezeigt |
| M5 | UVG ist bei SUVA-Firmen im Tarif-Schritt gesperrt |
| M6 | Aufteilung bleibt als Näherung im UI, ist klar als Schätzung beschriftet. Verbindlich rechnet das CDI |
| M7 | Dummy-Daten nutzen nur Werte, die der Wizard anbietet |
| M8 | KPIs und Diagramme rechnen relativ zum heutigen Datum |
| M9 | Tarifübernahme entfernt |
| M10 | Begriffe konsequent «Offerte» |

## 5. Umsetzungsphasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 0 | Analyse, Flowcharts, Plan | `docs/` (dieses Paket) |
| 1 | Projekt-Setup, Design-Tokens, UI-Komponenten, Layout | Lauffähiges Grundgerüst |
| 2 | Domain-Modell, Store mit sessionStorage, Dummy-Daten | Daten und Regeln testbar |
| 3 | Login, Dashboard (KPIs, Charts, Liste, Filter, Sortierung) | Einstieg fertig |
| 4 | Wizard Schritte 1 bis 7 inkl. ZEFIX, Validierung, Autosave, Home-Dialog | Erfassung komplett |
| 5 | CDI-Mock, Übermittlung, Ergebnisseite, PDF | End-to-end ohne Preis vor PDF |
| 6 | Detailansicht, Dokumente, Duplizieren, Demo-Statusaktionen, Kontaktformular | Funktionsumfang komplett |
| 7 | Tests (Regeln, Store, CDI-Mock), Build, Browser-Durchlauf | Abnahmebereit |

## 6. Akzeptanzkriterien

1. Im Schritt «Tarif» und in der «Übersicht» erscheint kein Preis.
2. Nach «Offerte übermitteln» erzeugt der CDI-Mock die Prämie und das PDF enthält den Preis.
3. Lohnsumme bis CHF 500'000 ohne Ja bei Frage 3 und 4: Offerte mit Preis, Status `processing`.
4. Lohnsumme über CHF 500'000 oder Ja bei Frage 3 oder 4: Hinweis im Wizard, Offertanfrage ohne Preis, Status `underwriting`.
5. Schaden > 10 % löst kein Underwriting aus. AKD-File lässt sich hochladen und erscheint in Übersicht und PDF.
6. Keine Tarifübernahme mehr in Antragsfrage 1.
7. Neue Offerte bleibt in der Session gespeichert, lässt sich fortsetzen, ansehen (inkl. PDF erneut laden) und duplizieren.
8. ZEFIX-Suche liefert echte Firmen und übernimmt Name, UID und Adresse.
9. Kontaktformular öffnet eine vorbefüllte E-Mail mit Offert-Kontext.
10. `npm run build` und `npm test` laufen fehlerfrei.
