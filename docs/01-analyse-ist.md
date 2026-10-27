# 01 · Analyse Ist-Zustand «Nexus_V2» (Figma Make Prototyp)

Quelle: https://whale-pace-34022696.figma.site/ (Stand 27.10.2026)

Die Analyse basiert auf dem vollständigen JavaScript-Bundle der Figma-Make-App (Quellcode-Ebene) und einer Prüfung im Browser. Alle Regeln, Werte und Texte unten stammen direkt aus dem Code.

## 1. Zweck und Nutzer

Interner **WebCalculator Personenversicherung** von Swiss Life. Kundenberater erfassen damit für ein Unternehmen eine Offerte bzw. einen Antrag für:

| Kürzel | Produkt | Bemerkung |
|---|---|---|
| UVG (UVGO & UVGF) | Obligatorische Unfallversicherung, Berufs- und Nichtberufsunfall | Max. versicherter Lohn CHF 148'200 pro Person. Entfällt bei SUVA-unterstellten Firmen |
| UVGZ | Unfall-Zusatzversicherung (VVG) | Heilungskosten, Invaliditätskapital, Todesfallkapital, Taggeld |
| KTG | Krankentaggeldversicherung (VVG) | Leistungshöhe, Wartefrist, Lohnnachgenuss, Leistungsdauer 730 Tage |

## 2. Screens und Navigation

```
Login (SSO-Mock) ──► Dashboard / Antragsübersicht ──► Detailansicht Antrag
                          │                                  │
                          └─► Wizard (7 Schritte) ◄──────────┘ (nur Status "Created": Bearbeiten)
                                    │
                                    └─► Abschlussseite
```

| Screen | Inhalt |
|---|---|
| **Login** | Button «Mit SSO anmelden» (Swiss Life Active Directory). 1.2 s Ladeanimation, kein echter Login |
| **Dashboard** | 7 KPI-Kacheln, 3 Diagramme, Suche, Statusfilter, erweiterte Filter, Sortierung, Tabelle mit Paginierung (20 pro Seite), Button «Neue Offerte erstellen» |
| **Wizard** | Header mit Logo, Benutzer, «Home»; Stepper mit 7 Schritten; schwebender FAQ-Chatbot |
| **Abschlussseite** | Erfolg («Vielen Dank für Ihre Bestellung») oder Underwriting («Antrag zur Überprüfung eingereicht») |
| **Detailansicht** | Statusbanner, alle erfassten Daten, Dokumente (Police, Antragsformular, Rechnungen) mit PDF-Vorschau, Blättern zwischen Anträgen, Chat mit Kundenberater (Mock) |

### Dashboard im Detail

* **KPIs**: Total Anträge, Contracted, Underwriting, Letzter Monat (Contracted), Win Rate (letzte 3 Monate), Prämienvolumen (Contracted, Mio. CHF), Lohnvolumen (Contracted, Mio. CHF).
* **Diagramme**: Statusverteilung (Donut), Monatliche Anträge (Balken: Contracted, Declined, Total), Abschlussrate Win Rate (Fläche), je 12 Monate.
* **Suche** über Firma, Branche, Ort, Kontaktperson, ID.
* **Statusfilter**: Alle, Contracted, Created, Processing, Underwriting, Declined (mit Zähler).
* **Erweiterte Filter**: Erstellungsdatum von/bis, Lohnsumme min/max, Mitarbeitende min/max.
* **Sortierung**: Unternehmen, Status, Mitarbeitende, Lohnsumme, Prämie, Produkte, Zuletzt aktualisiert.
* **Tabelle**: Unternehmen (Branche · Ort), Status-Badge, Kennzahlen (MA, Lohn, Prämie), Produkte, Datum, Aktionen (Löschen nur bei «Created»).
* **Dummy-Daten**: 420 deterministisch generierte Anträge (Seed 42). Verteilung: 160 Contracted, 75 Processing, 72 Declined, 63 Underwriting, 50 Created.

## 3. Wizard: die sieben Schritte

### Schritt 1 · Kundendaten

| Feld | Typ | Pflicht | Bemerkung |
|---|---|---|---|
| ZEFIX-Import | Suche + Button | nein | **Mock**: füllt immer «Muster AG, Bahnhofstrasse 42, 8001 Zürich, CHE-123.456.789, Dienstleistungen» |
| Firmenname | Text | ja | |
| UID-Nummer | Text | ja | Placeholder CHE-123.456.789, kein Format-Check |
| Branche | Auswahl (14 Werte) | als Pflicht markiert | **wird nicht validiert** |
| Kontaktperson | Text | ja | |
| NOGA-Code | Suchbare Auswahl, nach Branche gefiltert | als Pflicht markiert | **wird nicht validiert**. Zeigt Risikoklasse A bis E |
| E-Mail, Telefon | Text | ja | |
| Adresse, PLZ, Stadt | Text | ja | |
| Kundenberater | Suchbare Auswahl (9 Dummy-Berater) + «Neuen Berater erfassen» | ja | Mehrere Berater mit Split in %, Summe muss 100 % sein |

### Schritt 2 · Vertrag

| Feld | Werte |
|---|---|
| Vertragsstart | Datum |
| Zahlungsfrequenz | Halbjährlich, Jährlich |
| Vertragsdauer | 1, 3, 5 Jahre |

### Schritt 3 · Personal (Personengruppen)

* Beliebig viele Gruppen. Standard: «Das gesamte Personal».
* Pro Gruppe: Name, Anzahl Männer, Lohnsumme Männer, Anzahl Frauen, Lohnsumme Frauen (AHV-pflichtig, jährlich).
* **Automatische Aufteilung** in obligatorischen Lohn und Überschusslohn: `Durchschnittslohn = Lohnsumme / Anzahl`, obligatorisch = `min(Durchschnitt, 148'200) × Anzahl`, Rest ist Überschuss. Der Überschusslohn kann manuell überschrieben werden (max. Lohnsumme) und zurückgesetzt werden.
* **Namentlich versicherte Person** (Schalter): Typ Betriebsinhaber oder Mitarbeitende Familienmitglieder, Geschlecht, Name, Lohnsumme (genau 1 Person).
* Totale pro Geschlecht und gesamt, inkl. obligatorisch und Überschuss.
* Seitenpanel mit Erklärungen (Fixlöhner: Gewinnungskosten max. 30 % des AHV-Lohns, max. CHF 50'000).
* Hinweis «Underwriting erforderlich», wenn die Gesamtlohnsumme CHF 1'500'000 übersteigt.

### Schritt 4 · Antragsfragen (Akkordeon, nacheinander)

| # | Thema | Fragen | Folge |
|---|---|---|---|
| 1 | Bestehende Versicherungen | a) KTG nach VVG, b) UVG, c) UVGZ nach VVG. Bei einem Ja: Gesellschaft (Pflicht) und Policennummer | **Automatische Tarifübernahme**, wenn Gesellschaft «Vaudoise» oder «Helsana» enthält (nur Hinweistext, keine Logik dahinter) |
| 2 | Schadeninformationen | Leistungen in den letzten 5 Jahren? Bei Ja: Gesamtschadenbetrag (Pflicht), AKD-File | Underwriting, wenn Schaden > 10 % der Lohnsumme |
| 3 | Versicherungsannahme | Ablehnung oder erschwerte Bedingungen in den letzten 5 Jahren? Bei Ja: Details | Underwriting |
| 4 | Gesundheitszustand | a) chronisch krank, b) aktuell arbeitsunfähig, c) längere AU erwartet, d) invalid. Bei einem Ja: Details | Underwriting |

Der AKD-Upload ist ein Mock: Der Button setzt nur den Dateinamen «AKD_Vorversicherer_2026.pdf».

### Schritt 5 · Produkte

1. Pflichtfrage «Ist Ihre Firma der SUVA unterstellt?» (Ja/Nein). Erst danach erscheinen die Produktkarten.
2. Karte **Unfall** wählt UVG und UVGZ gemeinsam. Bei SUVA nur UVGZ (UVG bleibt bei der SUVA).
3. Karte **Krankheit** wählt KTG.
4. Mindestens ein Produkt nötig.

### Schritt 6 · Tarif

* **Empfehlung** auf Basis Überschusslohn:
  * mit Überschusslohn: UVGZ Private Spitalabteilung weltweit, IK 3fach Überschuss mit 350 % Progression, TK 2fach Überschuss, Taggeld 90 % / 30 Tage; KTG 90 % / 30 Tage mit Lohnnachgenuss.
  * ohne Überschusslohn: UVGZ «nicht empfohlen»; KTG 80 % / 60 Tage ohne Lohnnachgenuss.
* Buttons «Empfehlung übernehmen» und «Individuell anpassen».
* **Individuelle Konfiguration**:
  * UVGZ: Heilungskosten (an/aus), Invaliditätskapital (Basis UVG-Lohn / Überschuss / beides, 1 bis 3fach, Progression ohne / 225 % / 350 %), Todesfallkapital (Basis, 1 bis 3fach), Taggeld (80 / 90 / 100 %, Wartefrist 30 / 60 / 90 Tage).
  * KTG: Leistungshöhe 80 / 90 / 100 %, Wartefrist 30 / 60 / 90 Tage, Lohnnachgenuss.
  * Optional **pro Personengruppe** unterschiedliche Produkte und Deckungen.
* **Live-Preise**: Prämie je Produkt, Preisdifferenz je Option («+CHF …»), geschätzte Jahresprämie total. Ausgeblendet bei Underwriting.

### Schritt 7 · Übersicht

Zusammenfassung aller Daten, Prämienübersicht (ohne Underwriting), Underwriting-Hinweis mit Gründen. Button «Bestellen & PDF herunterladen» bzw. «Einreichen & PDF herunterladen». Das PDF (jsPDF, clientseitig) heisst «Versicherungspolice» bzw. «Offerte zur Überprüfung».

## 4. Geschäftsregeln (Ist)

### 4.1 Underwriting-Auslöser

| Regel | Bedingung |
|---|---|
| Lohnsumme | Gesamtlohnsumme > CHF 1'500'000 |
| Schaden | Schaden letzte 5 Jahre > 10 % der Gesamtlohnsumme |
| Ablehnung | Frage 3 = Ja |
| Gesundheit | Frage 4 a, b, c oder d = Ja |

Underwriting bedeutet: keine Preise, Status «Underwriting», Bearbeitungszeit ca. 14 Tage. Sonst Status «Processing».

### 4.2 Prämienberechnung (Dummy-Formeln im Browser)

Faktor `f` je nach NOGA-Bereich (Risikoklasse A bis E, Faktoren 0.75 bis 2.0 je Produkt).

| Produkt | Formel | Minimum |
|---|---|---|
| UVG | obligatorischer Lohn × 1.14 % × f | CHF 100 |
| UVGZ | Heilungskosten: Total × 0.15 % × f; IK: Basis × Fach × 0.2 % × (1.15 bei 225 %, 1.25 bei 350 %) × f; TK: Basis × Fach × 0.1 % × f; Taggeld: Total × (0.4 / 0.5 / 0.6 %) × (1 / 0.85 / 0.75 je Wartefrist) × f | CHF 300 |
| KTG | Total × (0.8 / 1.0 / 1.2 %) × (1 / 0.85 / 0.75 je Wartefrist) × f × 1.15 bei Lohnnachgenuss | CHF 800 |

### 4.3 Status

`created` → (Bestellen) → `processing` oder `underwriting`. `contracted` und `declined` existieren nur in den Dummy-Daten. Bearbeiten ist nur im Status `created` möglich.

### 4.4 Speichern

* Persistenz in `localStorage` (Schlüssel `swisslife_applications`), überlebt also auch das Schliessen des Browsers.
* «Neue Offerte erstellen» legt sofort einen leeren Eintrag an.
* Autosave bei jedem Schrittwechsel.
* «Home» öffnet einen Dialog: Speichern & zurück, Verwerfen & zurück, Abbrechen.

## 5. Gefundene Mängel im Original

| # | Mangel | Auswirkung |
|---|---|---|
| M1 | Branche und NOGA-Code sind als Pflicht markiert, werden aber nicht validiert (im Browser bestätigt) | Offerte ohne Risikoklasse möglich |
| M2 | Schritt 3 akzeptiert 0 Mitarbeitende und 0 Lohnsumme | Leere Offerten |
| M3 | «Verwerfen» löscht nichts: Der Entwurf wurde beim Anlegen und bei jedem Schrittwechsel bereits gespeichert | Leere «Neue Offerte»-Leichen im Dashboard |
| M4 | Neu erfasste Kundenberater erscheinen nicht in Übersicht und PDF (Lookup nur in der statischen Liste) | Fehlende Provisionszuordnung im Dokument |
| M5 | Bei SUVA-Firmen lässt sich UVG im Tarif-Schritt wieder einschalten | Fachlich unzulässige Offerte |
| M6 | Obligatorisch/Überschuss wird über den Durchschnittslohn berechnet | Bei ungleichen Löhnen falsch. Korrekt nur mit Einzellöhnen (gehört ins CDI) |
| M7 | Dummy-Daten nutzen Werte, die der Wizard nicht anbietet (monatlich, vierteljährlich, unbefristet, Wartefrist 14 / 180) | Inkonsistente Anzeige |
| M8 | KPIs und Diagramme rechnen mit fest codierten Stichtagen (März 2026) | Zahlen veralten |
| M9 | Tarifübernahme Vaudoise/Helsana ist nur ein Text ohne Funktion | Falsche Erwartung beim Berater |
| M10 | Endprodukt heisst «Police», obwohl fachlich erst eine Offerte entsteht | Begriffsverwirrung |
