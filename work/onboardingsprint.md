SaniMe – Implementationsplan: Onboarding & Erster Versorgungsauftrag

Ziel des Sprints

Der Kunde soll ohne Registrierung, Formulare oder Vorwissen innerhalb weniger Minuten seine erste Hilfsmittelversorgung starten können.

Der gesamte Ablauf muss sich natürlich, barrierefrei und vertrauenswürdig anfühlen. Der Kunde soll das Gefühl haben, dass SaniMe ihm Arbeit abnimmt – nicht zusätzliche Arbeit erzeugt.

Sprintziel

Ein vollständig funktionierender Onboarding-Flow vom ersten App-Start bis zum Versorgungsdashboard.

⸻

Leitprinzipien

Während des gesamten Onboardings gelten folgende Regeln:

* Genau eine Aufgabe pro Bildschirm
* Keine Formulare mit vielen Eingabefeldern
* Fotos vor Texteingaben
* Automatische Informationsextraktion
* Jede automatisch erkannte Information ist editierbar
* Jeder Schritt ist nachvollziehbar
* Keine Sackgassen
* Jeder Bildschirm besitzt Zurück und Weiter
* Fortschritt wird jederzeit gespeichert
* Der Nutzer kann jederzeit abbrechen und später fortsetzen

⸻

Architektur

Das Onboarding wird als State Machine implementiert.

Nicht:

Screen -> Screen -> Screen

sondern

OnboardingSession
↓
Current State
↓
Validierung
↓
Übergang
↓
Nächster State

Dadurch kann der Nutzer jederzeit:

* App schließen
* Gerät wechseln (zukünftig)
* Absturz erleben
* später fortsetzen

ohne Datenverlust.

⸻

OnboardingSession

Neue Entität

OnboardingSession
id
status
acceptedTerms
prescription
insuranceCard
selectedSupply
selectedAppointment
customerContact
checkoutStatus
completedAt

Alle Daten landen zunächst ausschließlich hier.

Erst nach erfolgreichem Checkout entsteht daraus der eigentliche Auftrag.

⸻

Screen 1 – Willkommen

Ziel

Emotion.

Vertrauen.

Keine Eingaben.

⸻

Inhalt

Animation

Logo

Kurzer Claim

Beispielsweise

Willkommen bei SaniMe

Wir begleiten dich durch deine Versorgung.

⸻

CTA

Weiter

⸻

Akzeptanz

Animation performant

Überspringbar

VoiceOver kompatibel

⸻

Screen 2 – Leistungsübersicht

Ziel

Der Kunde versteht sofort den gesamten Ablauf.

Visualisierung

Rezept fotografieren
↓
Krankenkassenkarte fotografieren
↓
Versorgung auswählen
↓
Termin vereinbaren
↓
Status verfolgen

Darunter:

Checkbox

□ Datenschutz

Checkbox

□ AGB

Beide Dokumente sind jederzeit erreichbar.

⸻

Validierung

Weiter erst möglich wenn

AGB akzeptiert

Datenschutz akzeptiert

⸻

Speicherung

Version

Zeitpunkt

IP (Backend)

Einwilligung

⸻

Screen 3 – Rezeptaufnahme

Ziel

Möglichst wenig Arbeit.

⸻

UI

Große Illustration

Kurze Erklärung

Großer Kamerabutton

Alternative

Foto aus Galerie

⸻

Nach Aufnahme

Automatisch

* Dokument erkennen
* Zuschneiden
* Perspektive korrigieren
* Bild verbessern
* OCR starten

⸻

Screen 4 – Rezeptprüfung

Anzeige aller erkannten Informationen

Beispielsweise

Arzt
Ausstellungsdatum
Diagnose
Hilfsmittel
Freitext
Hilfsmittelnummer

Unsichere OCR-Ergebnisse werden markiert.

Alle Felder editierbar.

⸻

Validierung

Pflichtfelder müssen vorhanden sein.

Falls OCR scheitert:

manuelle Eingabe.

⸻

Screen 5 – Krankenkassenkarte

Aufbau identisch.

⸻

Automatische Extraktion

Name

Versichertennummer

Krankenkasse

Geburtsdatum

ggf. Ablaufdatum

⸻

Bearbeitbar.

⸻

Screen 6 – Datenprüfung

Der Kunde sieht nun alle bekannten Informationen.

Person

Krankenkasse

Rezept

Er kann alles bearbeiten.

Danach

Weiter.

⸻

Screen 7 – Versorgungsauswahl

Jetzt startet die eigentliche Versorgung.

Tabs

Empfohlen
↓
Weitere passende Versorgungen
↓
Gesamter Katalog

Jede Karte zeigt

Produktbild

Hersteller

Beschreibung

Lieferzeit

Eigenanteil

Zuzahlung

Hilfsmittelnummer

Verfügbarkeit

Empfehlungsgrund

⸻

Produktdetail

Größere Bilder

Beschreibung

Eigenschaften

Lieferumfang

Hersteller

Downloads

Hinweise

⸻

CTA

Diese Versorgung auswählen

⸻

Screen 8 – Terminplanung

Jetzt kennt das System

Rezept

Versorgung

Standort

Krankenkasse

Dadurch kann erstmals intelligent geplant werden.

⸻

Automatisch berechnen

Bearbeitungsdauer

Lieferzeit

Lagerbestand

Tourenplanung

Entfernung

Auslastung

⸻

Dem Nutzer werden

3 Termine

vorgeschlagen.

Alternativ

Kalender.

⸻

Screen 9 – Zusammenfassung

Anzeige

Persönliche Daten

Rezept

Versorgung

Termin

Zuzahlung

Eigenleistung

⸻

Checkbox

Ich bestätige die verbindliche Beauftragung.

⸻

Weiter

⸻

Screen 10 – Checkout

Jetzt werden

E-Mail

Telefonnummer

erfragt.

Nicht früher.

Anschließend

Bezahlung

Eigenleistung

⸻

Nach erfolgreicher Zahlung

Bestellbestätigung

per

E-Mail

SMS (optional)

⸻

Screen 11 – Dashboard

Der Nutzer landet direkt im Dashboard.

Keine zusätzliche Anmeldung.

⸻

Er sieht

Versorgung
↓
Rezept eingegangen
↓
Prüfung
↓
Krankenkasse
↓
Genehmigung
↓
Bestellung
↓
Lieferung
↓
Termin
↓
Abgeschlossen

Zusätzlich

Kontakt

Dokumente

Timeline

Nachrichten

⸻

Fehlerfälle

Kamera verweigert

Erklärung

Einstellungen öffnen

Galerie verwenden

⸻

OCR unvollständig

Markierte Felder

Bearbeiten

Weiter

⸻

Kein Internet

Lokale Speicherung

Automatische Synchronisierung

⸻

Checkout fehlgeschlagen

Kein Datenverlust

Später erneut versuchen

⸻

App-Absturz

Fortsetzen an exakt derselben Stelle

⸻

Persistenz

Nach jedem Schritt speichern

OnboardingSession
↓
lokale Datenbank
↓
Backend

Niemals erst am Ende.

⸻

Accessibility

Pflicht

VoiceOver

TalkBack

44x44 Touch Targets

Dynamic Type

Screenreader Labels

Fokus-Reihenfolge

Kontraste

Haptisches Feedback

Keine Farbinformation ohne Text

⸻

Analytics

Nur anonymisierte Ereignisse

Screen geöffnet

OCR erfolgreich

OCR korrigiert

Versorgung gewählt

Termin gewählt

Checkout gestartet

Checkout abgeschlossen

Onboarding abgeschlossen

Keine Gesundheitsdaten in Analytics.

⸻

Akzeptanzkriterien

Der Sprint ist abgeschlossen, wenn:

* das komplette Onboarding ohne Medienbruch funktioniert
* jeder Schritt einzeln validiert wird
* Fortschritt jederzeit gespeichert wird
* OCR-Ergebnisse bearbeitet werden können
* Einwilligungen rechtssicher gespeichert werden
* eine Versorgung ausgewählt werden kann
* ein Termin ausgewählt werden kann
* der Auftrag verbindlich bestätigt werden kann
* der Checkout abgeschlossen werden kann
* der Nutzer unmittelbar im Versorgungsdashboard landet
* der gesamte Ablauf vollständig barrierefrei nutzbar ist
* sämtliche Fehlerfälle ohne Datenverlust abgefangen werden

⸻

Claude-Arbeitsauftrag

Dieses Onboarding ist der wichtigste Bestandteil von SaniMe.

Bei jeder Implementierungsentscheidung ist zu prüfen:

* Reduziert diese Änderung den Aufwand für den Kunden?
* Macht sie den Prozess verständlicher?
* Ist sie langfristig wartbar?
* Ist sie DSGVO-konform?
* Ist sie barrierefrei?
* Ist sie fehlertolerant?
* Kann der Nutzer den Vorgang jederzeit unterbrechen und ohne Datenverlust fortsetzen?

Falls eine einfachere oder robustere Lösung existiert, soll diese vorgeschlagen und begründet werden, bevor implementiert wird.