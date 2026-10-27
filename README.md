# Personenversicherung WebCalculator

Online-Rechner für Kollektiv-Offerten (UVG, UVGZ, KTG) im Swiss Life Design. Referenzimplementierung für die elipsLife/Swiss Life Umgebung. **Die Prämie rechnet ausschliesslich das CDI, der Preis erscheint erst im Offert-PDF.** Backend-Systeme (CDI, SSO, Mail) sind durch klar abgegrenzte Mocks ersetzt.

## Prozess

Der fachliche Ablauf ist in zwei Formen beschrieben:

| Dokument | Inhalt |
|---|---|
| [docs/prozess.md](docs/prozess.md) | Prozessbeschreibung mit Diagrammen (rendert direkt auf GitHub) |
| [docs/prozess.html](docs/prozess.html) | Gestaltete Prozessseite, im Browser öffnen |

## Starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests (Regeln, Validierung, CDI-Mock, Dummy-Daten)
npm run build      # Typecheck + Produktions-Build
npm run preview    # Build lokal ansehen (inkl. ZEFIX-Anbindung)
```

Konfiguration (optional, `.env.local`):

| Variable | Zweck | Standard |
|---|---|---|
| `VITE_SUPPORT_EMAIL` | Empfänger des Kontaktformulars | `offerten-support@example.ch` |
| `VITE_ZEFIX_BASE_URL` | Eigener ZEFIX-Endpunkt (Backend) | `/api/zefix` |

Hinter einem Firmen-Proxy vor dem Start `HTTPS_PROXY` setzen, damit die ZEFIX-Abfrage funktioniert.

## Architektur

```
src/
├── domain/          Typen, Konstanten, Regeln (Underwriting, Lohnaufteilung, Empfehlung), Validierung, NOGA
├── services/
│   ├── cdi/         CDI-Mock: einzige Stelle mit Tarif-Formeln (Platzhalter)
│   ├── zefix/       ZEFIX-Client mit Testdaten-Fallback
│   ├── pdf/         Offerte, Offertanfrage, Antrag, Police, Rechnung
│   └── mail/        mailto-Builder für das Kontaktformular
├── store/           Zustand-Store (Sitzungsspeicher), Dummy-Daten
├── features/        Wizard-Schritte, Dashboard, Detailansicht, Kontakt
├── pages/           Login, Dashboard, Wizard, Übermittlung, Detail
└── components/ui/   UI-Bausteine
server/zefixProxy.ts Serverseitiger ZEFIX-Aufruf für Dev und Preview
```

Für die Zielumgebung werden nur die Services getauscht:

| Teil | Hier | Zielumgebung |
|---|---|---|
| Berechnung | `services/cdi` (Mock) | CDI-Schnittstelle |
| PDF | `services/pdf` im Browser | PDF vom CDI |
| ZEFIX | `server/zefixProxy.ts` mit der Such-API von zefix.ch | Backend mit der offiziellen ZEFIX Public REST API |
| E-Mail | mailto | Mail-Service im Backend |
| Login | SSO-Button ohne Anmeldung | Swiss Life SSO (OIDC) |
| Speicher | Browser-Sitzung | Offert-Datenbank bzw. CDI |

## Hinweise

* ZEFIX wird serverseitig aufgerufen, weil zefix.ch direkte Browser-Aufrufe ablehnt. Die genutzte Such-API ist nicht offiziell dokumentiert.
* Tarif-Formeln, Risikoklassen und Prämien sind Platzhalter ohne fachliche Gültigkeit.
* Schriften: Source Serif 4 und Inter als frei verfügbarer Ersatz für die lizenzierten Swiss Life Hausschriften.
