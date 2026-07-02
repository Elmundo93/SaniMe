Ich würde den Finalisierungssprint nicht nach technischen Komponenten, sondern nach dem eigentlichen Betriebsablauf eines Sanitätshauses strukturieren. Dadurch wird jede implementierte Funktion später direkt einem realen Prozess zugeordnet und die Codebasis bleibt langfristig verständlich.

⸻

SaniMe – Finalisierungsplan (Version 1.0)

Ziel

Nach Abschluss dieses Plans besitzt SaniMe:

* eine produktionsreife iOS-/Android-App
* ein produktionsreifes Admin-Backend
* vollständige DSGVO-Konformität
* einen skalierbaren Datenbestand
* einen weitgehend automatisierten Versorgungsprozess
* eine Architektur, die sich später problemlos erweitern lässt

⸻

Phase 1 – UX Finalisierung

Status: höchste Priorität

Diese Phase entscheidet darüber, wie professionell sich SaniMe anfühlt.

⸻

Dashboard komplett neu denken

Ziele

Das Dashboard wird zur persönlichen Versorgungsübersicht.

Nicht:

“Hier ist deine aktuelle Versorgung”

Sondern:

“Hier verwaltest du alle deine Versorgungen.”

⸻

Aufbau

Header
Hallo Max
3 aktive Versorgungen
──────────────
Offene Aufgaben
──────────────
Versorgung 1
──────────────
Versorgung 2
──────────────
Versorgung 3
──────────────
Vergangene Versorgungen

⸻

Versorgungskarte

Jede Karte enthält:

* Produktbild
* Produktname
* Hersteller
* Status
* Fortschrittsbalken
* nächster Schritt
* letzter Statuswechsel
* Ansprechpartner
* Lieferzeit
* offene Aufgaben

Beispielsweise

Rollator
Genehmigung läuft
███████░░░
Nächster Schritt:
Prüfung Krankenkasse
aktualisiert vor 2 Stunden

⸻

Versorgung Detailansicht

Hier darf deutlich mehr Information stehen.

Beispielsweise

Produkt
Hersteller
Hilfsmittelnummer
Timeline
Dokumente
Kommunikation
Bestellung
Versand
Lieferung

Die bisherige Timeline wandert ausschließlich hierhin.

⸻

Floating Camera

Der wichtigste Button der gesamten App.

Er darf niemals hinter Content verschwinden.

Der FAB sollte:

* permanent sichtbar
* leicht erhöht
* glassy
* haptisches Feedback
* leichte Glow Animation
* Hero Animation beim Öffnen

⸻

Navigation vereinfachen

Ich würde langfristig nur drei Tabs besitzen.

Dashboard
Scan
Profil

Mehr benötigt der Endkunde nicht.

⸻

Leere Zustände

Alle Screens benötigen sinnvolle Empty States.

Beispielsweise

Keine Versorgung

↓

großes Kamera Icon

↓

Jetzt Rezept scannen

⸻

Fehlerzustände

* kein Internet
* Upload fehlgeschlagen
* OCR fehlgeschlagen
* Kamera verweigert
* Krankenkasse unbekannt

Alle mit klarer Handlungsempfehlung.

⸻

Phase 2 – Scan-Prozess perfektionieren

Hier entsteht der eigentliche Mehrwert.

⸻

Rezeptscan

Optimierungen

* automatische Kantenerkennung
* Perspektivkorrektur
* Qualitätsprüfung
* Unschärfeerkennung
* OCR
* Validierung

⸻

Krankenkassenkarte

Automatisch erkennen

* Name
* Versicherungsnummer
* Krankenkasse
* IK

⸻

Plausibilitätsprüfung

Nach dem Scan

Rezept vollständig?
↓
Ja
↓
Hilfsmittelnummer erkannt?
↓
Ja
↓
Versorgung erkannt
↓
Krankenkasse erkannt
↓
fertig

Falls nein

gezielte Rückfrage.

⸻

Phase 3 – Produktkatalog

Der Katalog ist das Herzstück.

⸻

Kategorien

Beispielsweise

Mobilität

Pflege

Kompression

Bandagen

Orthesen

Prothesen

Einlagen

Inkontinenz

Rehatechnik

Kinder

Pflegehilfsmittel

Wohnumfeld

⸻

Produkt

Jedes Produkt besitzt

* Name
* Hersteller
* Beschreibung
* Hilfsmittelnummer
* Varianten
* Farben
* Größen
* Lieferzeit
* Eigenanteil
* Zubehör
* Dokumente
* Bilder

⸻

Hersteller

Platzhalterdaten

* Sunrise Medical
* Meyra
* Rehasense
* Ottobock
* medi
* Juzo
* Hartmann
* Abena
* Invacare
* Bischoff & Bischoff

Damit kann die gesamte Software bereits produktionsnah entwickelt werden.

⸻

Phase 4 – Admin Dashboard

Das Backend wird vollständig workfloworientiert.

⸻

Übersicht

Neue Rezepte

↓

Genehmigungen

↓

Bestellungen

↓

Lieferungen

↓

Abgeschlossen

⸻

Kundenakte

Enthält

* Stammdaten
* Dokumente
* Versorgungen
* Kommunikation
* Historie

⸻

Versorgung

Eigene Detailseite

* Timeline
* Dokumente
* Lieferant
* Bestellung
* Lager
* Versand
* Notizen

⸻

Aufgaben

Jede Versorgung besitzt Tasks.

Beispielsweise

Genehmigung prüfen
↓
Bestellung auslösen
↓
Lieferung planen
↓
Rechnung erzeugen

⸻

Phase 5 – Automatisierung

Jetzt beginnt die eigentliche Zeitersparnis.

⸻

OCR Workflow

Scan
↓
OCR
↓
Produkt erkannt
↓
Hilfsmittel erkannt
↓
Krankenkasse erkannt
↓
Vorschlag erzeugen

⸻

Dokumentengenerierung

Automatisch erzeugen

* Kostenvoranschlag
* Anschreiben
* Rückfragen
* Lieferschein
* Rechnung

⸻

Statusänderungen

Automatische Push

Genehmigung eingegangen
↓
Bestellung ausgelöst
↓
Versand gestartet
↓
Lieferung erfolgt

⸻

Erinnerungen

Folgeversorgung

Wiedervorlage

Genehmigung läuft aus

Hilfsmittel austauschen

⸻

Phase 6 – Profil

Profil vollständig ausbauen.

⸻

Persönliche Daten

Name

Geburtsdatum

Telefon

Mail

⸻

Krankenkasse

Karte

Versichertennummer

Kasse

Hausarzt

⸻

Adressen

Lieferadresse

Rechnungsadresse

Zweitadresse

⸻

Dokumente

Rezepte

Genehmigungen

Rechnungen

Versorgungshistorie

⸻

Datenschutz

Einwilligungen

Datenexport

Löschen

⸻

Phase 7 – Design Polish

Jetzt entsteht Apple-Niveau.

⸻

Animationen

Alle Screenwechsel

Shared Element

Hero Animation

Card Expand

Pull to Refresh

Skeleton Loader

⸻

Glass Design

Einheitliche Glass-Komponenten.

Keine unterschiedlichen Blur-Stärken.

Keine unterschiedlichen Radiuswerte.

⸻

Typografie

Einheitliche Größen

Einheitliche Zeilenabstände

Einheitliche Margins

Einheitliches Spacing-System

⸻

Phase 8 – Performance

Optimierungen

Lazy Loading

Image Cache

Memory Cache

Prefetch

Virtual Lists

Offline Cache

Background Sync

⸻

Phase 9 – Sicherheit

DSGVO

Verschlüsselung

Audit Logs

Dokumentenverschlüsselung

Session Management

Berechtigungen

⸻

Phase 10 – Monitoring

Sentry

Performance Monitoring

Crash Reports

OCR Fehlerquote

Upload Erfolgsquote

Scan Dauer

Push Zustellung

⸻

Phase 11 – Qualitätssicherung

Automatisierte Tests

Unit Tests

Integration

E2E

Accessibility

Dark Mode

Offline

Gerätetests

⸻

Phase 12 – Produktionsvorbereitung

Operativ

* Präqualifikation abgeschlossen
* Krankenkassenverträge aktiv
* Hersteller angebunden
* Platzhalterkatalog durch Echtdaten ersetzt
* Lagerbestand definiert
* Versandprozess getestet
* Supportprozess dokumentiert

Rechtlich

* DSGVO-Texte final
* Impressum
* Datenschutzerklärung
* Einwilligungen
* Auftragsverarbeitung dokumentiert

Technisch

* Monitoring aktiv
* Backups eingerichtet
* App-Store-Metadaten fertig
* Release-Builds reproduzierbar
* Rollback-Strategie definiert
* Support- und Incident-Prozess festgelegt

⸻

Abschließendes Zielbild

Nach Abschluss dieses Plans bleibt SaniMe bewusst schlank und fokussiert. Die Anwendung konzentriert sich auf den gesamten Lebenszyklus einer Versorgung: Rezept erfassen → Versorgung auswählen → Bearbeitung verfolgen → Lieferung erhalten → Folgeversorgung verwalten. Alle Funktionen, vom Dashboard bis zum Admin-Backend, dienen diesem Kernprozess. Dadurch entsteht keine überladene Gesundheitsplattform, sondern ein digitales Sanitätshaus mit einer klaren Benutzerführung, hoher Automatisierung und einer Architektur, die sich mit wachsendem Geschäftsumfang nachhaltig erweitern lässt.