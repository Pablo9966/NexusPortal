# Personenversicherung WebCalculator (Referenzimplementierung)

Neubau des Figma-Prototyps «Nexus_V2» als wartbare React-App. Dient als Vorlage für die Entwicklung in der elipsLife/Swiss Life Umgebung. Backend und Security sind durch Mocks ersetzt. **Die Prämie rechnet ausschliesslich das CDI (hier ein Mock), der Preis erscheint erst im Offert-PDF.**

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/01-analyse-ist.md](docs/01-analyse-ist.md) | Analyse des Originals: Screens, Felder, Regeln, Formeln, gefundene Mängel |
| [docs/02-prozess-flowchart.md](docs/02-prozess-flowchart.md) | Prozess-Flowcharts (Mermaid): Soll-Gesamtprozess mit CDI, Wizard-Logik, Sequenz, Statusmodell, Session, Ist-Prozess |
| [docs/03-plan-neuentwicklung.md](docs/03-plan-neuentwicklung.md) | Entscheide, Architektur, Schnittstellen, Phasen, Akzeptanzkriterien |

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests (Regeln, Validierung, CDI-Mock, Dummy-Daten)
npm run build      # Typecheck + Produktions-Build
npm run preview    # Build lokal ansehen (inkl. ZEFIX-Proxy)
```

Konfiguration (optional, `.env.local`):

| Variable | Zweck | Standard |
|---|---|---|
| `VITE_SUPPORT_EMAIL` | Empfänger des Kontaktformulars | `offerten-support@example.ch` |
| `VITE_ZEFIX_BASE_URL` | Eigener ZEFIX-Endpunkt (Backend) | `/api/zefix` (Vite-Proxy) |

## Ablauf

1. **Login** (SSO-Mock) → **Dashboard** mit KPIs, Diagrammen, Offerten der Session und filterbarer Liste (420 Demo-Offerten).
2. **Wizard in 7 Schritten:** Kundendaten (echte ZEFIX-Suche, NOGA, Berater) → Vertrag → Personal → Antragsfragen (AKD-Upload) → Produkte (SUVA) → Tarif (Deckungen, **ohne Preise**) → Übersicht (**ohne Preise**).
3. **Übermitteln an das CDI** → CDI-Mock prüft Underwriting und rechnet → **Offerte als PDF inkl. Preis** (bzw. Offertanfrage ohne Preis bei Underwriting).
4. **Wiederverwenden in der Session:** Entwurf fortsetzen, übermittelte Offerte ansehen und PDF erneut laden, als Vorlage duplizieren.

Underwriting, wenn die Gesamtlohnsumme CHF 500'000 übersteigt, eine frühere Ablehnung besteht (Frage 3) oder eine Gesundheitsfrage mit Ja beantwortet wird (Frage 4). Vorschäden lösen kein Underwriting aus.

## Architektur

```
src/
├── domain/          Typen, Konstanten, Regeln (UW, Lohnaufteilung, Empfehlung), Validierung (Zod), NOGA
├── services/
│   ├── cdi/         CDI-Mock: einzige Stelle mit Tarif-Formeln (Dummy)
│   ├── zefix/       ZEFIX-Client mit Testdaten-Fallback
│   ├── pdf/         Offerte, Offertanfrage, Antrag, Police, Rechnung (jsPDF)
│   └── mail/        mailto-Builder für das Kontaktformular
├── store/           Zustand-Store mit sessionStorage, Dummy-Daten
├── features/        Wizard-Schritte, Dashboard, Detail, Kontakt
├── pages/           Login, Dashboard, Wizard, Übermittlung, Detail
└── components/ui/   UI-Bausteine im Swiss Life Design
server/zefixProxy.ts Serverseitiger ZEFIX-Aufruf für Dev/Preview
```

Für die Zielumgebung werden nur die Services getauscht: `services/cdi` gegen den echten CDI-Client, `services/pdf` entfällt (PDF kommt vom CDI), `server/zefixProxy.ts` gegen das Backend mit der offiziellen ZEFIX Public REST API, `services/mail` gegen einen Mail-Service, Login gegen SSO (OIDC).

## Hinweise

* Daten liegen nur im `sessionStorage` des Browser-Tabs. Tab schliessen löscht alles.
* Tarif-Formeln, Risikoklassen und Prämien sind Dummy-Werte aus dem Prototyp ohne fachliche Gültigkeit.
* Die ZEFIX-Such-API von zefix.ch ist nicht offiziell dokumentiert. Für die Produktion die offizielle API verwenden.
* Schriften: Source Serif 4 und Inter als frei verfügbarer Ersatz für die lizenzierten Swiss Life Hausschriften.
