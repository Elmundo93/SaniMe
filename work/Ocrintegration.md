Ich halte diesen Teil ebenfalls für erfreulich geradlinig. Gerade weil ihr nur zwei Dokumenttypen (Rezept + eGK) unterstützt und bewusst auf KI verzichtet, lässt sich die OCR wie ein eigenes kleines Subsystem entwickeln. Ziel sollte sein, dass dieser Teil später praktisch “fertig” ist und nur noch um neue Parser ergänzt werden muss.

⸻

OCR Implementationsplan

Phase 1 – Foundation

> **Status (2026-07-03):** ↔️ Abweichung vom Plan. Umgesetzt als flaches `lib/ocr/` (`detector.ts`, `processor.ts`, `engine.ts`, `rezeptParser.ts`, `egkParser.ts`, `validatoren.ts`, `mapper.ts`, `typen.ts`, `index.ts`) statt des vorgeschlagenen verschachtelten `src/features/ocr/{camera,detector,processor,...}`. Kein `camera/`-Modul — Kamerasteuerung bleibt in den Scan-Screens (`app/scan/rezept.tsx`/`krankenkasse.tsx`), keine eigene `captureDocument()`/`startPreview()`-API.

Ziel

Schaffung einer vollständig generischen OCR-Infrastruktur.

Modulstruktur

src/
    features/
        ocr/
            camera/
            detector/
            processor/
            engine/
            parser/
            validator/
            models/
            utils/
            hooks/
            components/
            screens/

Noch keinerlei Wissen über Rezepte.

⸻

Camera Layer

> **Status:** ❌ Nicht als eigenes Modul umgesetzt — kein `lib/ocr/camera`.

Verantwortung ausschließlich:

* Live Preview
* Autofokus
* Torch
* Auto Capture
* Zoom
* Bildqualität

API

captureDocument()
startPreview()
stopPreview()

⸻

Phase 2 – Document Detection

> **Status:** ⚠️ Teilweise. `DocumentType`-Erkennung (`UNBEKANNT`/`REZEPT`/`EGK`) ist umgesetzt in `lib/ocr/detector.ts`s `erkenneDokumenttyp()` und wird aktiv fürs Gating verwendet (`lib/ocr/index.ts` wirft `FalschesDokumentError`, wenn das erkannte Dokument nicht zum erwarteten Typ passt). Die Bildqualitätsprüfungen — Scharf?/Blendung?/Perspektive?/Capture Ready? — sind **nicht** umgesetzt; es gibt keine entsprechende Prüfung vor der OCR.

Dieses Modul beantwortet lediglich:

Was sehe ich?

Output

DocumentType
UNKNOWN
PRESCRIPTION
EGK

Außerdem

* Dokument vollständig?
* Scharf?
* Blendung?
* Perspektive?
* Capture Ready?

⸻

Phase 3 – Image Processing

> **Status:** ⚠️ Teilweise, bewusst reduziert für v1. `lib/ocr/processor.ts`s `normalisiereBild()` macht nur EXIF-Rotation-Backen + Downscale auf die Langseite (via `expo-image-manipulator`). Perspective Correction, Contrast, Denoise, Sharpen und Normalize fehlen — der Code kommentiert das explizit: "für v1 bewusst nicht enthalten... Apple Vision/ML Kit binarisieren intern bereits selbst". Das ist eine bewusste Scope-Entscheidung, kein vergessener Schritt — vor einer Umsetzung hier erst prüfen, ob echte OCR-Fehlerraten das überhaupt nötig machen.

Eine vollständig deterministische Pipeline.

Original
↓
Crop
↓
Perspective Correction
↓
Contrast
↓
Denoise
↓
Sharpen
↓
Normalize
↓
OCR Image

Alle Schritte einzeln austauschbar.

⸻

Phase 4 – OCR Engine

> **Status:** ↔️ Abweichung vom Plan. `lib/ocr/engine.ts` wrapped eine einzelne Engine (`expo-text-extractor`) statt zwei Implementierungen (`AppleVisionEngine`/`GoogleMlKitEngine`) hinter einem `OcrEngine`-Interface. Funktioniert plattformübergreifend über die eine Abstraktion von `expo-text-extractor`, daher bisher kein Bedarf für getrennte Implementierungen.

Interface

interface OcrEngine {
recognize(image)
}

Implementierungen

AppleVisionEngine
GoogleMlKitEngine

Später könnten problemlos weitere Engines ergänzt werden.

⸻

Phase 5 – Parser Framework

Jetzt beginnt eure eigentliche Businesslogik.

> **Status:** ↔️ Abweichung vom Plan, funktional aber vorhanden. Kein generisches `DocumentParser`-Interface mit `supports()`/`parse()` — stattdessen zwei konkrete Funktionen `rezeptParser.ts` und `egkParser.ts`, direkt von `lib/ocr/index.ts`s `erkenneRezept`/`erkenneKrankenkasse` aufgerufen (Auswahl erfolgt vorab über `erkenneDokumenttyp`, nicht über eine Parser-Registry).

Interface

interface DocumentParser {
supports()
parse()
}

Implementierungen

PrescriptionParser
EgkParser

Neue Dokumenttypen benötigen lediglich einen weiteren Parser.

⸻

Phase 6 – Prescription Parser

> **Status:** ✅ Umgesetzt in `lib/ocr/rezeptParser.ts`, flach statt in einem eigenen `prescription/`-Unterordner mit `fields.ts`/`mapping.ts`.

Eigene Konfiguration

prescription/
    parser.ts
    fields.ts
    validators.ts
    mapping.ts

Extrahiert

* Patient
* Krankenkasse
* Arzt
* IK
* Datum
* Hilfsmittel
* Hilfsmittelnummer

⸻

Phase 7 – eGK Parser

> **Status:** ✅ Umgesetzt in `lib/ocr/egkParser.ts`, wiederverwendet dieselbe `lib/ocr/`-Infrastruktur wie der Rezept-Parser (Detector, Engine, Mapper).

Analog.

Extrahiert

* Name
* Vorname
* Geburtsdatum
* Krankenkasse
* Versicherungsnummer
* Gültigkeit

⸻

Phase 8 – Validator Framework

> **Status:** ↔️ Abweichung vom Plan, funktional aber vorhanden. Alle Validierungen liegen gebündelt in einer Datei `lib/ocr/validatoren.ts` statt als separate Klassen in einem `validators/`-Ordner — kein eigener `DateValidator`/`InsuranceValidator`/etc. als benanntes Modul.

Alle Validatoren sind unabhängig.

validators/
    DateValidator
    InsuranceValidator
    IKValidator
    ProductValidator
    BirthdateValidator
    CompletenessValidator

Jeder Validator kennt nur genau eine Aufgabe.

⸻

Phase 9 – Mapping

> **Status:** ✅ Umgesetzt in `lib/ocr/mapper.ts`, mapped OCR-Rohergebnisse auf die Domänentypen aus `types/index.ts` (u. a. das OCR-Result/Confidence-Shape, das `OnboardingSession` konsumiert).

OCR kennt keine Domänenmodelle.

Deshalb

OCRResult
↓
Mapper
↓
Patient
Insurance
Prescription
OrderDraft

So bleibt OCR komplett entkoppelt.

⸻

Phase 10 – Review UI

> **Status:** ✅ Umgesetzt, allerdings nicht "automatisch generiert" — `components/onboarding/DatenFeld.tsx` ist ein handgebautes, wiederverwendetes Feld-mit-Confidence-Punkt, das `app/scan/review.tsx` (Rezept) und `app/scan/datenpruefung.tsx` (Gesamtübersicht) beide nutzen.

Automatisch generiert.

Name
✓
Geburtsdatum
✓
Hilfsmittel
⚠
Krankenkasse
✓

Der Benutzer korrigiert nur Fehler.

⸻

Phase 11 – Telemetrie

> **Status:** ❌ Nicht begonnen. Keine OCR-Dauer/Capture-Dauer/Fehlerrate-Erfassung irgendwo im Code — `lib/analytics.ts` deckt nur Onboarding-Übergänge ab (siehe `work/onboardingsprint.md`), keine OCR-spezifischen Kennzahlen.

Keine personenbezogenen Daten.

Nur Kennzahlen.

Beispielsweise

OCR Dauer
Capture Dauer
Parser Dauer
Fehlerrate
Abbruchrate
Parser Version

Damit könnt ihr die Pipeline kontinuierlich verbessern, ohne Gesundheitsdaten zu speichern.

⸻

Phase 12 – Testing

> **Status:** ⚠️ Teilweise. Unit-Tests existieren für Parser/Validatoren/Mapper als `lib/ocr/*.test.ts` (jest via `jest.config.js` + `jest-expo`-Preset, aktuell noch uncommitted). Keine Snapshot-Tests (OCR-Output → Parser-Output), kein anonymisierter Testdatensatz mit den beschriebenen Varianten (schief/Schatten/unscharf/verschiedene Geräte) — die Tests laufen auf synthetischen/konstruierten Eingaben, nicht auf echten Dokumentfotos.

Unit Tests

Jeder Parser

Jeder Validator

Jeder Mapper

⸻

Snapshot Tests

OCR Output →

Parser Output

muss identisch bleiben.

⸻

Testdatensatz

Anonymisierte Dokumente.

Varianten

* leicht schief
* Schatten
* unscharf
* verschiedene Smartphones
* verschiedene Krankenkassen
* verschiedene Ärzte

⸻

Erweiterbarkeit

Der eigentliche Clou ist die Plugin-Architektur.

Document
↓
Detector
↓
Parser Registry
↓
Prescription Parser
Egk Parser
Future Parser
↓
Validator Registry
↓
Mapper

Wenn später beispielsweise ein Pflegegradbescheid oder ein Kostenvoranschlag gescannt werden soll, ergänzt ihr lediglich:

* neuen Parser
* neue Felddefinitionen
* neue Validatoren

Die übrige Pipeline bleibt unverändert.

⸻

Entwicklungsreihenfolge

> **Status (2026-07-03):** Schritte 3–7 sind sinngemäß umgesetzt (native OCR über eine Engine statt zwei, Prescription- und eGK-Parser, Validatoren, Review-Screen). Schritt 1 (dedizierte Camera/Auto-Capture-Schicht) und Schritt 2 (Perspektivkorrektur) wurden bewusst ausgelassen bzw. auf ein Minimum reduziert (siehe Phase 3 oben). Schritt 8 (umfassende Testabdeckung) ist nur teilweise da — Unit-Tests ja, Snapshot-Tests/anonymisierter Testdatensatz nein.

Ich würde die Umsetzung bewusst inkrementell planen:

1. Camera & Auto Capture – zuverlässige Dokumentaufnahme.
2. Image Processing – perspektivische Korrektur und Bildoptimierung.
3. Native OCR – Apple Vision und Google ML Kit hinter einem gemeinsamen Interface.
4. Prescription Parser – erster vollständiger End-to-End-Flow.
5. eGK Parser – Wiederverwendung der bestehenden Infrastruktur.
6. Validatoren – Plausibilitäts- und Vollständigkeitsprüfungen.
7. Review Screen – Benutzer bestätigt oder korrigiert erkannte Felder.
8. Umfassende Testabdeckung – anonymisierte Testdokumente und Snapshot-Tests.

Fazit

Die OCR ist aus meiner Sicht einer der Bereiche, die ihr einmal sauber entwickelt und danach kaum noch anfasst. Durch die klare Trennung in Kamera, Bildverarbeitung, OCR, Parser, Validator und Mapping entsteht ein eigenständiges Framework innerhalb von SaniMe. Neue Dokumenttypen lassen sich später mit minimalem Aufwand ergänzen, ohne bestehende Komponenten zu verändern. Das passt sehr gut zu eurem Ziel einer langlebigen, wartbaren und möglichst leichtgewichtigen Architektur.