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

> **Umsetzungsstatus (2026-07-03):** ⚠️ Teilweise. Dashboard ist versorgungszentriert umgebaut (`app/(app)/dashboard/index.tsx`: Header + Offene Aufgaben + Versorgungskarten), FAB mit Glow/Haptics/Hero-Animation existiert (`components/ui/CameraButton.tsx`), Navigation ist exakt 3 Tabs (`app/(app)/_layout.tsx`s `PremiumTabBar`). Leere Zustände: nur ein ad-hoc Empty-State im Dashboard, keine wiederverwendbare `EmptyState`/`ErrorState`-Komponente. Fehlerzustände (kein Internet, Upload fehlgeschlagen, OCR fehlgeschlagen, Kamera verweigert, Krankenkasse unbekannt) sind **nicht** als systematische UI-Zustände umgesetzt.

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

> **Umsetzungsstatus:** ⚠️ Teilweise, aktiv in Arbeit (aktuell uncommitted). Echte On-Device-OCR (`lib/ocr/`) ist geschrieben und in `app/scan/rezept.tsx`/`krankenkasse.tsx` verdrahtet — ersetzt die frühere Mock-OCR aus `lib/mockOcr.ts`. Details/Abweichungen siehe `work/Ocrintegration.md`, insbesondere: keine Kantenerkennung/Perspektivkorrektur/Unschärfeerkennung (bewusst für v1 ausgelassen). Die Plausibilitätsprüfung nach dem Scan existiert über `hatPflichtfelderRezept`/`hatPflichtfelderKomplett` in `store/onboardingMachine.ts`.

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

> **Umsetzungsstatus:** ❌ Nicht begonnen. `lib/mockOcr.ts`s `MOCK_PRODUKTE` enthält aktuell nur 3 Produkte, alle in der Kategorie "Rollstuhl" — keine der 12 hier vorgeschlagenen Kategorien oder der 10 Platzhalter-Hersteller sind abgebildet. Per CLAUDE.md ausdrücklich als Platzhalter markiert (keine echten Hersteller-/Preis-/Hilfsmittelnummer-Daten verwenden) — Erweiterung braucht zusätzlich eine Datenquelle/-lizenzierung, ist also nicht rein durch Engineering lösbar.

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

> **Umsetzungsstatus:** ❌ Nicht begonnen. Kein Backend-Repository/keine Admin-Route existiert — dieses Repo enthält ausschließlich die Mobile-App, alle Daten sind in Zustand-Stores gemockt (siehe CLAUDE.md). Strukturell blockiert, bis ein Backend existiert; keine Engineering-Aufgabe in diesem Repo.

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

> **Umsetzungsstatus:** ❌ Nicht begonnen (ebenfalls Backend-abhängig). Der clientseitige Teil des OCR-Workflows (Scan → OCR → Vorschlag) existiert bereits (siehe Phase 2), aber Dokumentengenerierung, automatische Statusänderungen/Push und Erinnerungen brauchen serverseitige Logik, die in diesem Repo nicht existiert.

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

> **Umsetzungsstatus:** ⚠️ Teilweise, aktiv in Arbeit (aktuell uncommitted). `app/(app)/einstellungen/index.tsx` macht Vorname/Nachname/Telefon/E-Mail, Krankenkasse/Versichertennummer und Lieferadresse (Straße/PLZ/Ort) editierbar, mit Vollständigkeits-Badges (`lib/vollstaendigkeit.ts`, `components/settings/`). Geburtsdatum, Hausarzt, Rechnungsadresse und Zweitadresse fehlen als editierbare Felder (Rechnungsadresse ist ein UI-Stub mit leerem `onPress`). Dokumente-Sektion (Rezepte/Genehmigungen/Rechnungen) und Datenschutz-Aktionen (Export/Löschen) sind ebenfalls UI-Stubs bzw. lösen nur eine lokale Alert-Bestätigung ohne echte Backend-Anbindung aus.

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

> **Umsetzungsstatus (korrigiert 2026-07-03):** ⚠️ Deutlich weiter als zunächst eingeschätzt, aber nicht vollständig. Design-Tokens sind vollständig migriert (`packages/@sanime/design-system`), dazu kommen konsolidierte Header (`ScreenHeader`/`CameraOverlayHeader`/`BackLink`, in 9+2+3 Screens verdrahtet), ein einheitliches Glass-System mit `tier`-gesteuerter Reflection (`GlassCard`), ein konsolidierter `HeroGlow`-Hintergrund (3 Screens) und ein vollständig auf Feather vereinheitlichtes Icon-System — siehe `work/Designplan.md` für den Volldetails-Stand (Phasen 1, 3, 4, 6, 7 dort). Weiterhin nicht vorhanden: Shared-Element-Transitions, Card-Expand, Pull-to-Refresh (`RefreshControl`/`onRefresh` kommt im gesamten Code nicht vor) und Skeleton-Loader (kein Treffer für "Skeleton" im Code) — echte Lücken, keine Fehleinschätzung.

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

> **Umsetzungsstatus:** ❌ Nicht begonnen. Keine `NetInfo`-, `FlashList`-, Prefetch-, Image-/Memory-Cache-, Offline-Cache- oder Background-Sync-Nutzung irgendwo im Code gefunden.

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

> **Umsetzungsstatus:** ⚠️ Teilweise. `lib/secureStorage.ts` wrapped `expo-secure-store` für sensible Felder (Commit `92256cd` "Harden storage for sensitive data"), `store/authStore.ts`s `aktualisiereBenutzer` nutzt das bereits (`setSecureJSON`). Keine Audit-Logs (kein Treffer für "audit" im Code), keine Dokumentenverschlüsselung über SecureStore hinaus, kein explizites Session-Management. DSGVO-Texte selbst sind Platzhalter (`constants/legal.ts`).

DSGVO

Verschlüsselung

Audit Logs

Dokumentenverschlüsselung

Session Management

Berechtigungen

⸻

Phase 10 – Monitoring

> **Umsetzungsstatus:** ❌ Nicht begonnen. Kein Sentry oder anderes Crash-/Performance-Reporting im Code oder in `package.json`s Dependencies.

Sentry

Performance Monitoring

Crash Reports

OCR Fehlerquote

Upload Erfolgsquote

Scan Dauer

Push Zustellung

⸻

Phase 11 – Qualitätssicherung

> **Umsetzungsstatus:** ⚠️ Teilweise, gerade erst begonnen (aktuell uncommitted). `jest.config.js` + `jest-expo`-Preset und 5 Unit-Test-Dateien unter `lib/ocr/*.test.ts` existieren jetzt. Keine Integration-, E2E-, Accessibility-, Dark-Mode-, Offline- oder Gerätetests. Insbesondere `store/onboardingMachine.ts` (die pure State-Machine-Logik) hat noch keine eigenen Tests, obwohl sie sich dafür am besten eignet.

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

> **Umsetzungsstatus:** ❌ Nicht begonnen. Diese Phase ist praktisch vollständig Nicht-Code-Arbeit (Präqualifikation, Krankenkassenverträge, Hersteller-Anbindung, DSGVO-Texte final, App-Store-Metadaten, Backups) — sie liegt außerhalb dessen, was Engineering in diesem Repo lösen kann, und braucht einen eigenen Produkt-/Geschäfts-Zeitplan parallel zur technischen Arbeit.

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