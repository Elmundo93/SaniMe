# Datenschutzerklärung SaniMe — ENTWURF

> **Entwurf zur rechtlichen Prüfung, nicht veröffentlichen.** Stand des Entwurfs: 28.10.2026.
> Beschreibt die App so, wie sie technisch gebaut ist (Code-Stand Branch `ocr-muster16-parser`).
> Alles in [eckigen Klammern] ist offen und muss vor Veröffentlichung ausgefüllt bzw. geprüft werden —
> gesammelt in der **Prüfliste am Ende**. Diese Fassung muss unter einer öffentlichen Adresse erreichbar
> sein (Voraussetzung der deutschen Netzbetreiber für die Telefonbestätigung über das Mobilfunknetz)
> und in der App unter „Datenschutz“ angezeigt werden.

---

## 1. Wer ist verantwortlich?

Verantwortlich für die Verarbeitung Ihrer Daten in der App SaniMe ist:

[Firmenname, Rechtsform]
[Anschrift]
[E-Mail-Adresse für Datenschutzanfragen], [Telefon]
[Handelsregister, Vertretungsberechtigte]

Datenschutzbeauftragte(r): [Name/Dienstleister, Kontakt] — [prüfen: Benennungspflicht nach Art. 37 DSGVO / § 38 BDSG; bei umfangreicher Verarbeitung von Gesundheitsdaten regelmäßig erforderlich]

## 2. Das Wichtigste in Kürze

- **Fotos bleiben auf Ihrem Gerät.** Rezept und Krankenversichertenkarte werden direkt auf Ihrem Smartphone ausgelesen. Das Foto selbst wird nie an uns übertragen — nur die erkannten Angaben, die Sie vorher prüfen und korrigieren können.
- **Gesundheitsdaten nutzen wir nur für Ihre Versorgung.** Also um Ihr Rezept bei der Krankenkasse einzureichen, Ihr Hilfsmittel zu liefern und Sie dabei zu begleiten. Nicht für Werbung, nicht für Analysen, nicht zum Verkauf.
- **Suchen, Merkliste, Warenkorb und Vorschläge bleiben auf Ihrem Gerät**, bis Sie eine Bestellung abschicken.
- **Sie behalten die Kontrolle:** Daten exportieren, löschen und Einwilligungen widerrufen können Sie direkt in der App unter *Einstellungen → Datenschutz*.

## 3. Welche Daten wir wofür verarbeiten

### 3.1 Katalog durchsuchen (ohne Bestellung)

Um Ihnen Produkte, Kategorien und Ratgeber-Inhalte anzuzeigen, ruft die App diese von unserem Server ab. Dabei verarbeitet unser Server technisch notwendig Ihre IP-Adresse und die angefragte Seite.

- **Suchbegriffe** werden zur Anzeige der Ergebnisse an unseren Server übermittelt, aber **nicht gespeichert** und nicht ausgewertet. In Fehlerprotokollen werden sie unkenntlich gemacht.
- **Spracheingabe:** Gesprochenes wird ausschließlich auf Ihrem Gerät in Text umgewandelt (Spracherkennung des Betriebssystems im Offline-Modus). Die Aufnahme verlässt Ihr Gerät nicht. Ist eine Erkennung auf dem Gerät nicht möglich, bricht die App ab, statt auf eine Online-Erkennung auszuweichen.
- **„Wobei brauchst du Hilfe?“, Merkliste und Warenkorb** werden nur auf Ihrem Gerät gespeichert (im verschlüsselten Speicher des Betriebssystems).
- **Personalisierter Katalog:** Wenn Sie bereits Versorgungen bei uns haben, berechnet die App auf Ihrem Gerät Vorschläge (z. B. passendes Zubehör). Dafür werden keine zusätzlichen Daten über Sie an uns übertragen.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der App auf Ihren Wunsch) bzw. lit. f (sicherer Betrieb). [prüfen: § 25 Abs. 2 Nr. 2 TDDDG für den Zugriff auf den Gerätespeicher]

### 3.2 Rezept und Krankenversichertenkarte erfassen

Sie fotografieren Ihr Rezept (Muster 16) und ggf. Ihre Krankenversichertenkarte. Die Texterkennung läuft **vollständig auf Ihrem Gerät**. An unseren Server übermittelt werden ausschließlich die erkannten und von Ihnen bestätigten Angaben:

- Name, Geburtsdatum und Anschrift der versicherten Person,
- Krankenkasse, Institutionskennzeichen (IK) und Versichertennummer,
- verordnender Arzt (Name, Arztnummer), Ausstellungsdatum,
- Diagnose und verordnetes Hilfsmittel (ggf. Hilfsmittelnummer).

Das Originalfoto wird nicht an uns übertragen und nicht von uns gespeichert. Die App prüft einige Angaben automatisch auf Plausibilität (z. B. Prüfziffern der Versichertennummer); alle Angaben bleiben von Ihnen änderbar. Es findet **keine automatisierte Entscheidung** im Sinne von Art. 22 DSGVO statt — ob und wie Sie versorgt werden, entscheiden Ihre Krankenkasse und wir als Menschen.

Rechtsgrundlage: Ihre ausdrückliche Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO, die Sie vor dem ersten Rezept-Scan erteilen, sowie Art. 6 Abs. 1 lit. b DSGVO (Durchführung Ihrer Bestellung). [prüfen: ob zusätzlich bzw. stattdessen Art. 9 Abs. 2 lit. h DSGVO i. V. m. § 22 Abs. 1 Nr. 1 lit. b BDSG (Gesundheitsversorgung) und die sozialrechtlichen Vorschriften für Leistungserbringer (§§ 126 ff., 302 SGB V) greifen]

### 3.3 Einwilligung in AGB und Datenschutz

Wenn Sie AGB und Datenschutzerklärung zustimmen, speichern wir die Version der Texte, den Zeitpunkt und die IP-Adresse, von der aus Sie zugestimmt haben — als Nachweis (Art. 7 Abs. 1 DSGVO).

Damit Sie bei einer weiteren Bestellung nicht erneut zustimmen müssen, legt die App auf Ihrem Gerät einen Nachweis-Schlüssel ab. Er ermöglicht nur die Übernahme dieser Zustimmung und gibt keinen Zugriff auf Ihre Daten. Ändern sich die Texte, fragen wir erneut. **Sie können diese dauerhafte Zustimmung jederzeit in der App unter *Einstellungen → Datenschutz → Meine Einwilligungen* widerrufen**; danach fragen wir vor jeder neuen Bestellung erneut. Ein Widerruf berührt die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung nicht. [prüfen: Zulässigkeit der dauerhaften Einwilligung für Art.-9-Daten, Bestimmtheit]

### 3.4 Bestellung und Kundenkonto

Wenn Sie eine Bestellung abschicken, legen wir ein Kundenkonto an bzw. ordnen die Bestellung Ihrem bestehenden Konto zu (Abgleich über die Versichertennummer). Dazu verarbeiten wir:

- die Angaben aus 3.2, Ihre Lieferadresse, Telefonnummer und optional E-Mail-Adresse,
- die bestellten Produkte, Rezepte je Produkt, Termin und Bestellverlauf,
- bei Selbstzahler-Artikeln die Zahlungsinformationen (siehe 3.9).

Bestellen Sie für eine andere versicherte Person (andere Versichertennummer), wird die Versorgung dieser Person zugeordnet; dafür bestätigen Sie Ihre Telefonnummer.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO, für Gesundheitsdaten Art. 9 Abs. 2 lit. a DSGVO [bzw. lit. h, siehe 3.2].

### 3.5 Einreichung bei Ihrer Krankenkasse und Lieferung

Damit Ihre Krankenkasse die Kosten übernimmt, übermitteln wir den Kostenvoranschlag mit den Rezeptangaben an Ihre Krankenkasse [Übermittlungsweg: z. B. elektronisches Kostenvoranschlagsverfahren über [Dienstleister] — offen] und erhalten deren Entscheidung. Für die Lieferung geben wir die nötigen Angaben (Name, Lieferadresse, Termin, Produkt) an [den ausliefernden Partner/Lieferanten, falls nicht wir selbst] weiter. Die gesetzliche Zuzahlung rechnen wir nach der Genehmigung bzw. Lieferung ab.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b und c DSGVO, Art. 9 Abs. 2 lit. h DSGVO i. V. m. [§§ 127, 302 SGB V — prüfen] bzw. Ihre Einwilligung.

### 3.6 Bestätigung Ihrer Telefonnummer

Bevor wir eine Bestellung für eine neue Person annehmen, bestätigen wir Ihre Mobilnummer — damit wir Sie bei Rückfragen und im Notfall sicher erreichen.

**a) Per SMS-Code.** Sie erhalten einen 6-stelligen Code per SMS. Für den Versand nutzen wir [Deutsche Telekom AG / Telekom Developer Verify — genaue Vertragsgesellschaft und technischer Dienstleister (Vonage) prüfen] [bzw. seven communications GmbH & Co. KG, Kiel]. Übermittelt werden Ihre Mobilnummer und der Code. Den Code speichern wir nur verschlüsselt (gehasht), er gilt 10 Minuten; zum Schutz vor Missbrauch begrenzen wir die Zahl der Codes je Nummer und protokollieren Bestätigungsversuche.

**b) Über Ihr Mobilfunknetz (ohne SMS).** Wenn Sie zustimmen, kann die Bestätigung ohne SMS erfolgen: Dabei wird Ihre Mobilfunknummer an Ihren Mobilfunkanbieter (Telekom Deutschland, Vodafone oder Telefónica Germany/O2) übermittelt, und Ihr Mobilfunkanbieter prüft anhand der IP-Adresse Ihrer mobilen Datenverbindung, ob die Nummer zu der SIM-Karte in Ihrem Gerät gehört. Wir erhalten nur das Ergebnis (bestätigt oder nicht). Gelingt die Prüfung nicht — etwa weil Sie per WLAN verbunden sind —, erhalten Sie stattdessen einen SMS-Code. Die Einwilligung holen wir unmittelbar vor der Prüfung in der App ein.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO (sichere Zuordnung der Bestellung, Missbrauchsschutz); für b) zusätzlich Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO [und § 25 TDDDG — prüfen].

### 3.7 Notfalllieferung

Brauchen Sie ein Hilfsmittel früher, als Genehmigung und Termin es erlauben, können Sie einen Rückruf anfragen. Wir verarbeiten dazu den Grund (Auswahl aus festen Optionen, z. B. „Entlassung aus dem Krankenhaus“), Ihre bevorzugte Anrufzeit und Ihre Rückrufnummer. Eine Notfalllieferung wird nie automatisch zugesagt; unser Team ruft Sie an.

Rechtsgrundlage: wie 3.4; der Grund kann Rückschlüsse auf Ihre Gesundheit zulassen (Art. 9 Abs. 2 lit. a bzw. h DSGVO).

### 3.8 Benachrichtigungen (Push)

Wenn Sie es erlauben, informieren wir Sie per Push-Nachricht über den Stand Ihrer Versorgung (z. B. „Antrag versendet“, „Versorgung genehmigt“). Dazu speichern wir die Gerätekennung für Benachrichtigungen (Push-Token) zu Ihrem Kundenkonto und übermitteln die Nachricht über den Benachrichtigungsdienst von Apple (Apple Push Notification service, Apple Inc. / Apple Distribution International Ltd.). Die Nachrichten enthalten **keine** Produktnamen, Diagnosen oder Krankenkassen — Details sehen Sie erst in der App. Beim Abmelden in der App wird das Gerät abgemeldet; die Erlaubnis können Sie jederzeit in den iOS-Einstellungen entziehen.

Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Ihre Erlaubnis), [§ 25 Abs. 1 TDDDG — prüfen].

### 3.9 Bezahlung von Selbstzahler-Artikeln

Artikel ohne Kassenleistung bezahlen Sie in der App über Stripe (Stripe Payments Europe, Ltd., Dublin, Irland). Ihre Zahlungsdaten (z. B. Kartennummer) geben Sie direkt bei Stripe ein; wir erhalten sie nicht, sondern nur den Status und Betrag der Zahlung. Stripe ist für die Zahlungsabwicklung [eigenständig verantwortlich / Auftragsverarbeiter — prüfen]; es gilt die Datenschutzerklärung von Stripe.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.

### 3.10 Betrieb, Sicherheit und Nachvollziehbarkeit

- **Server-Protokolle:** Bei jedem Aufruf verarbeitet unser Server technisch die IP-Adresse, Zeitpunkt und aufgerufene Funktion. [Speicherdauer der Server-Logs festlegen, z. B. 14 Tage]
- **Zugriffsprotokolle:** Jeder Zugriff unserer Mitarbeitenden auf Gesundheitsdaten wird protokolliert (wer, wann, welcher Datensatz), um Missbrauch zu erkennen.
- **Fehleranalyse:** [Falls aktiviert: Sentry (Functional Software, Inc., USA) — Fehlermeldungen werden vor dem Versand von Gesundheits- und Kontaktdaten bereinigt. Falls nicht genutzt: Absatz streichen.]
- **Nutzungsanalyse:** Wir setzen derzeit **keine** Analyse- oder Tracking-Dienste ein. [Bei künftiger Einführung ergänzen; technisch können Analyse-Ereignisse keine Gesundheitsdaten enthalten.]

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer Betrieb) und Art. 32 DSGVO.

## 4. Wo Daten auf Ihrem Gerät gespeichert werden

Gesundheitsbezogene Angaben einer begonnenen Bestellung (erkannte Rezeptdaten, Krankenkasse, Warenkorb, Kontaktdaten) speichert die App im **verschlüsselten Speicher des Betriebssystems** (iOS-Schlüsselbund). Weniger sensible Einstellungen (z. B. Bearbeitungsstand) liegen im normalen App-Speicher. Beim Abmelden werden die lokalen Daten entfernt.

## 5. Empfänger und Dienstleister

Ihre Daten erhalten nur, wer sie für Ihre Versorgung braucht:

| Empfänger | Zweck | Daten |
|---|---|---|
| Ihre Krankenkasse | Kostenübernahme | Rezept-, Versicherten- und Produktangaben |
| [Liefer-/Versorgungspartner] | Lieferung, Anpassung | Name, Lieferadresse, Termin, Produkt |
| [Hosting-Anbieter, Rechenzentrum in Deutschland/EU] | Betrieb von Server und Datenbank | alle serverseitig gespeicherten Daten (Auftragsverarbeitung) |
| [Speicher-Anbieter für Dokumente, S3-kompatibel] | Ablage von Dokumenten (z. B. Genehmigungen, Datenexporte) | Dokumente (Auftragsverarbeitung) |
| Deutsche Telekom [/ Vonage] bzw. [seven communications] | SMS-Code, Netzprüfung | Mobilnummer, Code / Prüfergebnis |
| Ihr Mobilfunkanbieter | Netzprüfung (nur mit Einwilligung, 3.6 b) | Mobilnummer, IP-Adresse |
| Apple | Push-Nachrichten | Push-Token, Nachrichtentext |
| Stripe | Zahlung | Zahlungsdaten, Betrag |

Wir verkaufen keine Daten und geben sie nicht zu Werbezwecken weiter.

## 6. Übermittlung in Drittländer

Grundsätzlich verarbeiten wir Ihre Daten in der EU. Eine Übermittlung in die USA kann bei Apple (Push), Stripe (Zahlung) und [Vonage als technischem Dienstleister der Telekom Verify — prüfen] stattfinden. Sie stützt sich auf [den Angemessenheitsbeschluss zum EU-US Data Privacy Framework bzw. Standardvertragsklauseln — je Anbieter prüfen].

## 7. Wie lange wir Daten speichern

| Daten | Speicherdauer |
|---|---|
| Begonnene, nicht abgeschlossene Bestellungen | nach 90 Tagen anonymisiert |
| Bestätigungscodes | gelten 10 Minuten, werden spätestens nach einer Stunde gelöscht |
| Datenexporte (Ihre Download-Datei) | 7 Tage |
| Kundenkonto, Versorgungen, Rezeptangaben | für die Dauer der Kundenbeziehung, danach [Frist festlegen] |
| Abrechnungs- und Buchungsunterlagen | 10 Jahre (§ 147 AO, § 257 HGB) |
| [Dokumentation der Hilfsmittelversorgung] | [Aufbewahrungsfrist nach Versorgungsvertrag/SGB V prüfen] |
| Einwilligungsnachweise | [solange die Einwilligung genutzt wird + Nachweisfrist, prüfen] |
| Server-Protokolle | [Frist festlegen] |

Löschen Sie Ihr Konto, löschen wir Adressen, Profil- und Kontaktdaten sowie Push-Tokens und anonymisieren das Kundenkonto. Daten, die wir aus gesetzlichen Gründen aufbewahren müssen (z. B. Abrechnungen), werden bis zum Fristende gesperrt aufbewahrt und danach gelöscht.

## 8. Ihre Rechte

Sie haben das Recht auf
- **Auskunft** (Art. 15 DSGVO) — in der App unter *Einstellungen → Datenschutz → Daten exportieren* erhalten Sie Ihre Daten als Datei,
- **Berichtigung** (Art. 16) — z. B. unter *Einstellungen → Mein Profil*,
- **Löschung** (Art. 17) — in der App unter *Einstellungen → Datenschutz → Daten löschen*,
- **Einschränkung der Verarbeitung** (Art. 18), **Datenübertragbarkeit** (Art. 20),
- **Widerspruch** gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21),
- **Widerruf Ihrer Einwilligungen** mit Wirkung für die Zukunft (Art. 7 Abs. 3) — in der App unter *Einstellungen → Datenschutz → Meine Einwilligungen*, für Push in den iOS-Einstellungen.

Für alles andere genügt eine Nachricht an [E-Mail-Adresse]. Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei [der für unseren Sitz zuständigen Landesbehörde: Name, Adresse].

## 9. Müssen Sie Ihre Daten angeben?

Für das Stöbern im Katalog nicht. Für eine Bestellung über Ihre Krankenkasse sind die Rezept- und Versichertenangaben erforderlich — ohne sie können wir das Hilfsmittel nicht abrechnen. Die Telefonnummer brauchen wir, um Sie bei Rückfragen zu erreichen. Push-Nachrichten sind freiwillig.

## 10. Sicherheit

Verbindungen zwischen App und Server sind verschlüsselt (TLS). Auf dem Gerät liegen sensible Angaben im verschlüsselten Speicher des Betriebssystems. Auf dem Server sind Zugriffe rollenbasiert beschränkt und werden protokolliert; Bestätigungscodes werden nur gehasht gespeichert. [Verschlüsselung der Datenbank „at rest“ beim Hosting-Anbieter bestätigen.]

## 11. Änderungen

Wir passen diese Erklärung an, wenn sich die App oder die Rechtslage ändert. Bei wesentlichen Änderungen fragen wir Ihre Zustimmung in der App erneut ab.

Version: [Datum der Veröffentlichung — identisch mit `DATENSCHUTZ_VERSION` in der App]

---

## Prüfliste für die rechtliche Prüfung (nicht Teil des veröffentlichten Textes)

1. **Verantwortlicher, Datenschutzbeauftragter, Aufsichtsbehörde** (Abschn. 1, 8) eintragen; Pflicht zur Benennung eines DSB prüfen.
2. **Rechtsgrundlage Gesundheitsdaten** (3.2, 3.4, 3.5): Einwilligung (lit. a) vs. Gesundheitsversorgung (lit. h i. V. m. § 22 BDSG, SGB V). Hängt an der Rolle von SaniMe (eigener Leistungserbringer mit Versorgungsverträgen oder Vermittler?).
3. **Dauerhafte Einwilligung** (3.3): Zulässigkeit für Art.-9-Daten über mehrere Bestellungen (offen seit 19.10.2026).
4. **Übermittlungsweg an Krankenkassen** und Liefer-/Versorgungspartner (3.5, Tabelle 5) festlegen.
5. **Telekom Verify:** Vertragspartner (Deutsche Telekom vs. Vonage), Rolle (Auftragsverarbeiter?), Drittlandbezug; Wortlaut der Einwilligung für die Netzprüfung ist von den Netzbetreibern vorgegeben und in der App umgesetzt. Diese Datenschutzerklärung muss unter einer öffentlichen URL stehen und die Prüfung über den Mobilfunkanbieter erklären (Abschn. 3.6 b) — Voraussetzung für die Freigabe.
6. **TDDDG § 25**: Zugriffe auf den Gerätespeicher (Warenkorb, Einwilligungs-Schlüssel, Push-Token) — technisch notwendig oder einwilligungspflichtig?
7. **Hosting- und Speicher-Anbieter** benennen, AV-Verträge, Standort, Verschlüsselung at rest.
8. **Speicherfristen** für Kundendaten, Versorgungsdokumentation, Einwilligungsnachweise, Server-Logs festlegen (Abschn. 7). Technisch umgesetzt sind bisher nur: abgebrochene Bestellungen 90 Tage (anonymisieren), Exporte 7 Tage, Codes 1 Stunde.
9. **Sentry/Fehleranalyse**: einsetzen oder Absatz streichen.
10. **Stripe**: Rolle (eigener Verantwortlicher vs. Auftragsverarbeiter).
11. **Alter Platzhaltertext in der App** (`constants/legal.ts`) behauptet „Ende-zu-Ende verschlüsselt“ — das ist technisch **nicht** zutreffend und muss mit Veröffentlichung dieses Textes ersetzt werden. Danach `DATENSCHUTZ_VERSION` hochzählen (löst eine erneute Zustimmung aus).
