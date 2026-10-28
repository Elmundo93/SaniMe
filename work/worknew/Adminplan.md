# Adminplan — SaniMe Admin-App („Innendienst“)

Stand: 2026-10-28 · Status: **Phase 0 + 1 umgesetzt** (siehe §10), Phasen 2–4 offen

Ziel: Unser Team kann jede Versorgung vom Eingang bis zur Übergabe bearbeiten, ohne Terminal-Skript (`backend:versorgung-status`) und ohne Datenbankzugriff. Die App muss **praktisch** sein (schnellster Weg zur nächsten Aufgabe) und **zugänglich** (WCAG 2.1 AA, vollständig per Tastatur bedienbar).

---

## 0. Ausgangslage (was es schon gibt)

Backend hat bereits eine Admin-Schicht, nur keine Oberfläche:

| Bereich | Vorhanden | Endpunkt / Ort |
|---|---|---|
| Login | E-Mail + Passwort → JWT (8 h), Fehlversuche im Audit-Log | `POST /admin/auth/login` |
| Rechte | 5 Permissions je Admin (`orders:read/write`, `health-data:write`, `compliance:read/manage`), keine benannten Rollen | `auth/permissions.ts`, `role_permissions` |
| Arbeitskorb | offene `open_actions` (intern) | `GET /admin/inbox` |
| Versorgungen | Liste, Detail (Order + Supply + Timeline + Aufgaben + Notizen + Termin) | `GET /admin/orders[/:id]` |
| Bearbeiten | Statuswechsel (nur legale FSM-Kanten), interne Notiz, Timeline-Eintrag für den Kunden | `PATCH …/status`, `POST …/notes`, `POST …/timeline` |
| Aufgaben | entstehen automatisch je Ereignis (`OPEN_ACTIONS_META`), `schritt`-Aufgaben erledigen sich beim nächsten Statuswechsel | `open-actions.consumer.ts` |
| Push | Kunde wird bei `AntragVersendet`/`InsuranceApproved/-Rejected` benachrichtigt | `KUNDEN_NACHRICHTEN` |
| DSGVO | Löschanträge prüfen/ausführen, Datenexport | `/admin/deletion-requests`, `/admin/…/data-export` |
| Audit | `audit_entries`, Lesezugriffe über `@AuditRead()` | `audit/` |

**Fehlt im Backend** (Details §5): Admin-Verwaltung, 2FA, Logout/Sitzungsablauf, Notfall-Rückrufe erledigen, Aufgaben zuweisen/erledigen, Kundensuche, Filter/Paginierung, Lieferantenwahl mit Daten (`SupplierAssigned` trägt keinen Lieferanten), Genehmigungsschreiben hochladen, Termin umplanen, Katalogpflege.

---

## 1. Wer arbeitet damit? (Rollen)

| Rolle | Typischer Tag | Braucht | Sieht **nicht** |
|---|---|---|---|
| **Sachbearbeitung** (Innendienst) | Anträge an Kassen, Fristen nachhalten, Kunden anrufen | Arbeitskorb, Versorgung komplett, Rezeptdaten, Notizen | Compliance, Team |
| **Lieferung / Außendienst** | Termine fahren, Übergabe | Tagesliste: Adresse, Produkt, Termin, Telefon; „Übergeben“ | Diagnose, Rezeptdetails, Kassen-Entscheidung |
| **Teamleitung** | Verteilen, Überblick, Team verwalten | alles von Sachbearbeitung + Auslastung + Team & Rechte | — |
| **Datenschutz / Compliance** | Löschanträge, Auskünfte, Audit | Compliance-Bereich, Audit-Log | Arbeitskorb (nur bei Bedarf lesend) |
| **Katalogpflege** (später) | Produkte, Preise, Ratgeber | Katalog | Kunden- und Gesundheitsdaten |

Die bestehenden Permissions bleiben die Prüfgrundlage; **Rollen sind nur benannte Bündel** davon (siehe §5.1). Ein Mensch kann mehrere Rollen haben.

---

## 2. Leitprinzipien

Abgeleitet aus den App-Regeln in `CLAUDE.md`, übertragen auf Mitarbeitende:

1. **Arbeitskorb statt Datenbank-Browser.** Startseite ist „Was ist jetzt zu tun?“, nicht eine Tabelle aller Bestellungen. Jede Aufgabe führt direkt in die Versorgung, an die Stelle, an der gehandelt wird.
2. **Ein nächster Schritt pro Versorgung.** Die Detailseite zeigt oben genau eine primäre Aktion (aus Status + offenen Aufgaben abgeleitet), z. B. „Antrag als versendet markieren“. Weitere Aktionen sind sekundär.
3. **Die App kann nichts Illegales anbieten.** Status-Buttons werden aus `@sanime/domain`'s `SUPPLY_TRANSITIONS` für den aktuellen Status erzeugt — dieselbe Tabelle, die der Server prüft. Kein Freitext-Status, kein Dropdown mit allen 14 Werten.
4. **Ableiten statt abtippen.** Frist (`erwarteteAntwortBis`), Kasse, Adresse, Telefon kommen aus vorhandenen Daten. Eingaben nur für das, was wirklich neu ist (Entscheidung der Kasse, Notiz, Lieferant).
5. **Folgen sichtbar machen.** Jede Aktion sagt vorher, was der Kunde bekommt („Der Kunde erhält eine Push-Nachricht: ‚Versorgung genehmigt‘“). Unumkehrbares (Ablehnung, Löschung) braucht eine Bestätigung mit klarer Beschriftung — kein „OK/Abbrechen“.
6. **Datensparsam anzeigen.** Listen zeigen Name, Status, Frist, Kasse — keine Diagnose, kein Rezepttext. Gesundheitsdaten erst in der Detailansicht (und jeder Abruf wird protokolliert). Kein CSV-Export im MVP.
7. **Deutsche Fachsprache, keine Technik.** „Antrag versendet“, nicht `insurance_review`. Statuslabels zentral (wie `constants/labels.ts` in der App).
8. **Fehlermeldungen mit nächstem Schritt** („Die Versorgung wurde inzwischen von Anna bearbeitet. Bitte lade die Seite neu, um den aktuellen Stand zu sehen.“).

---

## 3. Plattform & Technik

### Empfehlung: Web-App (Desktop zuerst), eigenes Workspace-Paket `apps/admin/`

Begründung:
- Innendienst arbeitet am PC mit Telefon daneben: große Bildschirme, Tastatur, mehrere Tabs. Eine native App bringt hier nichts, kostet aber Store-Freigaben und Builds.
- Tabellen, Tastaturkürzel, Browser-Zoom, Screenreader (NVDA/JAWS/VoiceOver) — das alles ist im Web ausgereift, in React Native Web nur mühsam.
- Außendienst bekommt dieselbe Web-App **responsiv** (Tagesliste am Handy), keine zweite App.

Stack-Vorschlag:
- **Vite + React + TypeScript**, Routing mit **React Router**, Serverdaten mit **TanStack Query** (Cache, Neuladen, optimistische Updates bewusst **aus** — wie in der Kunden-App gilt request-then-apply).
- **`@sanime/domain` direkt importiert** (rohes TS, Vite kann das ohne Build-Schritt) → Statusübergänge, Fristen, Notfall-Vokabular, Labels identisch zu App und Backend.
- **Design-Tokens aus `@sanime/design-system`** (Farben, Abstände, Typografie sind reine Werte) → als CSS-Variablen; Komponenten selbst schreiben, schlank, semantisches HTML. Keine schwere UI-Bibliothek; falls doch, eine mit nachweislich guter A11y (z. B. React Aria).
- Kein SSR, kein CDN-Caching von Antworten (Gesundheitsdaten). Auslieferung als statische Dateien hinter derselben Domain wie die API (z. B. `admin.sanime.de`), strikte CSP.
- Kein Analytics, kein Sentry-Replay; Fehlerberichte nur mit gescrubbten Pfaden (wie Backend `scrub.ts`).

Alternative (nicht empfohlen): Expo-Router-Web im bestehenden App-Projekt — spart ein Paket, aber vermischt Kunden- und Mitarbeitercode in einem Bundle und RN-Web-Tabellen sind schwach zugänglich.

---

## 4. Informationsarchitektur & Screens

```
Anmelden (E-Mail, Passwort, 2FA-Code)
└─ Hauptnavigation (links, per Tastatur: Alt+1…6)
   1 Arbeitskorb        ← Start
   2 Versorgungen       (Suche + Filter)
   3 Rückrufe & Notfälle
   4 Termine            (Tag/Woche, Außendienst: „Meine Touren“)
   5 Kunden             (Suche)
   6 Verwaltung         (Team & Rechte · Datenschutz · Katalog später)
```

### 4.1 Arbeitskorb (Start)
- Eine Liste offener interner Aufgaben, **vorsortiert nach Dringlichkeit**:
  1. Notfall-Rückrufe (rot + Symbol + Text „Notfall“ — nie nur Farbe)
  2. Fristen der Kasse in ≤ 3 Tagen überschritten/fällig (§ 13 Abs. 3a SGB V, aus `erwarteteAntwortBis`)
  3. Neue Bestellungen („Antrag an die Krankenkasse senden“), älteste zuerst
  4. Rest nach Alter
- Je Zeile: Aufgabe · Kunde (Name) · Wartet seit · Frist · Bearbeiter:in. Ein Klick/Enter öffnet die Versorgung.
- Schnellfilter als Tabs: **Alle · Mir zugewiesen · Nicht zugewiesen · Notfälle**. „Übernehmen“ weist die Aufgabe mir zu (verhindert Doppelarbeit).
- Leerer Zustand: „Alles erledigt. Neue Bestellungen erscheinen hier automatisch.“

### 4.2 Versorgung (Detail) — das Herzstück
Zweispaltig (Desktop), einspaltig gestapelt (schmal):

**Kopf:** Kunde · Produkt · Kasse · Status-Badge (Text + Symbol) · Frist („Antwort der Kasse spätestens am 18.11.“)

**Nächster Schritt (oben, hervorgehoben):** die eine primäre Aktion, z. B.
- `submitted` → **„Antrag versendet“** (Hinweis: Kunde bekommt Push, Frist startet)
- `insurance_review` → **„Genehmigt“** / „Abgelehnt“ (Ablehnung mit Bestätigungsdialog + Pflicht-Notiz)
- `approved` → **„Lieferant festlegen“** (Auswahl aus `supplier_products` des Produkts)
- `ordered` → **„Termin bestätigen“** / umplanen
- `appointment_scheduled` → **„Übergeben“**
- `delivered` → **„Abschließen“**

**Linke Spalte:** Rezept & Versicherung (OCR-Felder, lesend; „Korrigieren“ öffnet ein Formular, Änderung wird auditiert) · Positionen/Kosten (Kassenartikel vs. Selbstzahler, Zuzahlung) · Lieferadresse · Termin · Notfall-Anfrage (falls vorhanden) · Dokumente (Genehmigungsschreiben hochladen — Phase 2).

**Rechte Spalte:** Verlauf = Timeline für den Kunden **und** interne Notizen in einer chronologischen Liste, klar getrennt markiert („Sieht der Kunde“ vs. „Intern“). Eingabefeld unten: Notiz (Standard) oder „Nachricht in Kunden-Timeline“ (explizit umschalten).

**Telefon-Shortcut:** Telefonnummer als `tel:`-Link — Rückruf ist der häufigste Handgriff.

### 4.3 Versorgungen (Liste)
Suche (Name, Versichertennummer, Bestellnummer) + Filter (Status-Gruppe, Kasse, Zeitraum, Bearbeiter:in, „nur Selbstzahler“). Filter stehen in der URL (teilbar mit Kolleg:innen, Zurück-Taste funktioniert). Paginierung serverseitig.

### 4.4 Rückrufe & Notfälle
Liste der `urgent_delivery_requests` ohne `resolvedAt`: Grund, Erreichbarkeit („vormittags“), Telefon, wartet seit. Aktion: **„Zurückgerufen“** mit Ergebnis (feste Auswahl: Notfalllieferung zugesagt / nicht nötig / nicht erreicht → erneut versuchen) + optionale Notiz.

### 4.5 Termine
Tages-/Wochenliste (keine Drag-and-drop-Kalender als einzige Bedienung — die sind kaum zugänglich). Außendienst-Ansicht „Meine Touren heute“: Adresse (Karten-Link), Uhrzeit, Produkt, Telefon, Button „Übergeben“. Keine Diagnose, kein Rezept.

### 4.6 Kunden
Suche → Kundenkarte: Stammdaten, Versorgungen, Einwilligungen (inkl. dauerhafter Einwilligung), Push aktiv ja/nein. Jeder Abruf landet in `access_logs`.

### 4.7 Verwaltung
- **Team & Rechte:** Personen einladen (E-Mail-Link, Passwort selbst setzen, 2FA einrichten), Rollen zuweisen, deaktivieren (nie löschen — Audit-Bezug bleibt).
- **Datenschutz:** Löschanträge (prüfen → ausführen, mit Vier-Augen-Hinweis), Datenauskünfte, Audit-Log durchsuchen.
- **Katalog** (Phase 4): Produkte, Lieferantenpreise, Verfügbarkeit, Ratgeber mit `geprueft_am`.

---

## 5. Backend-Ergänzungen

### 5.1 Auth & Rechte
- **2FA (TOTP) Pflicht** für alle Admins — Zugriff auf Gesundheitsdaten nach Art. 9 DSGVO; Passwort allein reicht nicht.
- Token **nicht** im `localStorage`: httpOnly + `SameSite=Strict`-Cookie oder nur im Speicher mit kurzem Access- + Refresh-Token. Inaktivitäts-Timeout 30 min (Warnung 2 min vorher, Eingaben bleiben erhalten), absolutes Maximum 8 h.
- `POST /admin/auth/logout`, `GET /admin/me` (Name, Rollen, Permissions → UI blendet aus, was nicht erlaubt ist; Server prüft trotzdem).
- Benannte Rollen (`rollen`-Tabelle oder feste Konstante in `permissions.ts`) → Permissions; neue Permissions: `team:manage`, `delivery:read/write` (Außendienst, eingeschränkte Felder), `catalog:write`.
- Admin-Lebenszyklus: einladen, deaktivieren, Passwort zurücksetzen. `admin_users` bekommt `name`, `deaktiviert_am`, `totp_secret` (verschlüsselt).

### 5.2 Arbeitskorb & Versorgungen
- `GET /admin/inbox` um Sortierschlüssel (Notfall, Frist, Alter) und Zuweisung erweitern; `open_actions.assigned_admin_id`, `POST /admin/actions/:id/assign`, `POST /admin/actions/:id/resolve` (für Nicht-`schritt`-Aufgaben).
- `GET /admin/orders` mit Filter/Suche/Cursor-Paginierung; Listenantwort ohne Gesundheitsdaten.
- **Konflikterkennung:** `PATCH …/status` mit erwarteter Version/Status (`If-Match` oder `expectedStatus`) → 409 statt stillem Überschreiben, wenn zwei Personen gleichzeitig arbeiten.
- `SupplierAssigned` mit `supplierProductId` als Payload (heute ohne Daten).
- Rezept-/Versicherungsfelder korrigieren: `PATCH /admin/supplies/:id/rezept` mit Audit-Eintrag (alter/neuer Wert nur als Feldname, nicht als Wert im Log).

### 5.3 Notfall, Termine, Dokumente
- `GET /admin/urgent-deliveries`, `POST …/:id/resolve { ergebnis, notiz? }`.
- `GET /admin/appointments?von&bis[&mine]`, umplanen/absagen (mit Kunden-Push).
- Genehmigungsschreiben: vorhandenes `document`-Modul (S3/MinIO) nutzen, an Supply hängen; App zeigt es später in der Versorgung.

### 5.4 Nicht anfassen
- `SupplyOrderService.applyTransition()` bleibt der einzige Weg für Statuswechsel; Admin-UI ruft ausschließlich die bestehenden Endpunkte.
- `resolveOwnerFilter`: Admin = unbeschränkt **innerhalb der eigenen Organisation** — Tenant-Filter bleibt.

---

## 6. Zugänglichkeit (ab Phase 0, nicht am Ende)

- **WCAG 2.1 AA** wie in der App; zusätzlich mit Blick auf BITV/EN 301 549 (Arbeitgeber müssen Arbeitsmittel barrierefrei bereitstellen).
- **Tastatur vollständig:** sichtbarer Fokusring, „Zum Inhalt springen“-Link, logische Reihenfolge, Kürzel (`g a` Arbeitskorb, `/` Suche, `j/k` nächste/vorige Zeile, `?` Übersicht der Kürzel) — alle Kürzel abschaltbar (WCAG 2.1.4).
- **Semantik:** echte `<table>` mit `<th scope>` für Listen, `<button>` statt klickbarer `<div>`, Landmarks (`nav`, `main`, `aside`), Überschriften-Hierarchie pro Seite.
- **Status nie nur über Farbe:** Badge = Symbol + Text; Fristen zusätzlich als Text („überfällig seit 2 Tagen“).
- **Live-Regionen** für Ergebnisse („Status auf ‚Genehmigt‘ geändert. Kunde wurde benachrichtigt.“), Fokus nach Dialogen zurück an den Auslöser.
- **Zoom 200 % / Reflow 320 px** ohne horizontales Scrollen; Schrift in `rem`.
- **Kontrast** aus Design-Tokens geprüft (≥ 4.5:1 Text, ≥ 3:1 UI); Hell/Dunkel-Modus.
- **Zeitlimits:** Inaktivitäts-Warnung mit „Angemeldet bleiben“ (WCAG 2.2.1).
- **Tests:** `axe-core` in Komponententests (Vitest + Testing Library) + Playwright-E2E mit axe-Prüfung je Seite; manueller Screenreader-Durchgang (NVDA + VoiceOver) pro Phase.

---

## 7. Phasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **0 — Grundgerüst** | `apps/admin/` (Vite/React), Tokens, Layout + Navigation, Login inkl. 2FA, `/admin/me`, Logout, Sitzungsablauf, axe/Playwright-Setup | Man kann sich sicher anmelden |
| **1 — MVP „produktiv“** | Arbeitskorb (sortiert, zuweisen), Versorgung-Detail mit Nächster-Schritt-Aktion, Notizen & Kunden-Timeline, Versorgungsliste mit Suche/Filter, Konflikterkennung | **`backend:versorgung-status` wird überflüssig** — Team kann komplett arbeiten |
| **2 — Alltag** | Rückrufe & Notfälle, Termine (inkl. Außendienst-Ansicht), Lieferant mit Daten, Rezeptkorrektur, Genehmigungsschreiben hochladen, Kundensuche | Keine Nebenkanäle (Excel/Zettel) mehr nötig |
| **3 — Verwaltung** | Team einladen/deaktivieren, Rollen, Datenschutz-Bereich (Löschanträge, Auskünfte, Audit-Log) | Teamleitung & DSB arbeiten ohne Entwickler |
| **4 — Ausbau** | Katalogpflege, Kennzahlen (Durchlaufzeit, Fristen, Auslastung — aggregiert, ohne Personenbezug), Zuzahlungs-Einzug, Android-Push-Status | |

Abnahme je Phase: typecheck/lint/tests grün, axe ohne Verstöße, ein vollständiger Durchlauf nur mit Tastatur und einer mit Screenreader.

---

## 8. MVP-Abnahmekriterien (Phase 1)

1. Eine neue Bestellung aus der App erscheint ohne Neuladen innerhalb von 60 s im Arbeitskorb.
2. Von „Bestellung eingegangen“ bis „Abgeschlossen“ lässt sich jede Versorgung nur über die Admin-App durchziehen; jede Aktion zeigt vorher, ob und was der Kunde erfährt.
3. Es gibt keinen Button für einen Übergang, den der Server ablehnen würde.
4. Zwei Personen am selben Fall: die zweite bekommt eine verständliche Meldung statt eines stillen Überschreibens.
5. Listen enthalten keine Diagnose/Rezeptinhalte; jede Detailansicht erzeugt einen `access_logs`-Eintrag.
6. Alle Aufgaben in Phase 1 sind ohne Maus erledigbar.

---

## 9. Entscheidungen & offene Fragen

### Vorschlag (zur Bestätigung)
- Web-App statt nativer App, eigenes Paket `apps/admin/`, Vite + React + `@sanime/domain`.
- 2FA (TOTP) Pflicht ab Tag 1.
- Außendienst nutzt dieselbe Web-App responsiv, eingeschränkte Rolle.
- Kein Datenexport (CSV) im MVP.

### Offen
1. **Teamgröße & Rollen:** Wie viele Personen arbeiten zum Start damit, und gibt es Außendienst/Lieferung schon als eigene Personen?
2. **Hosting:** Wo läuft das Backend produktiv? (bestimmt Domain/Cookie-Strategie für den Admin-Login)
3. **Kassenkommunikation:** Bleibt der Antrag vorerst manuell (Fax/Portal/eKV extern) und die Admin-App dokumentiert nur „versendet“? (Annahme: ja.)
4. **Katalogpflege:** In der Admin-App (Phase 4) oder aus einem Warenwirtschaftssystem/Lieferanten-Import?
5. **Vier-Augen-Prinzip:** Für welche Aktionen nötig — nur Löschung, oder auch Ablehnung durch die Kasse?

---

## 10. Umsetzungsstand (2026-10-28)

Umgesetzt mit den Vorschlägen aus §9 als Annahmen (Web-App, 2FA ab Tag 1, Kassenantrag weiter manuell, kein CSV-Export).

**Phase 0 — Grundgerüst:** `apps/admin/` (Vite, React, TanStack Query, react-router), Tokens aus `@sanime/design-system`, Layout mit Sprunglink, Navigation, Tastenkürzeln (abschaltbar); Login mit Pflicht-TOTP inkl. Einrichtung (QR + Schlüssel als Text), httpOnly-Cookie-Sitzung (30 min gleitend, max. 8 h), CSRF-Header, Sperre nach 5 Fehlversuchen, Inaktivitäts-Warnung; `GET /admin/auth/me`, Logout; deaktivierte Admins verlieren den Zugang sofort.

**Phase 1 — MVP:** Arbeitskorb (sortiert nach Notfall/Frist/neu, Filter Alle/Mir/Nicht zugewiesen/Notfälle, Übernehmen/Freigeben, 30-s-Aktualisierung); Versorgungsliste (Suche, Statusgruppen, Paginierung, URL-Parameter); Versorgungsdetail (Nächster Schritt aus der gemeinsamen Übergangstabelle, Bestätigungsdialog mit Kundenfolgen, Ablehnung mit Pflicht-Begründung, Konflikterkennung per `erwarteterStatus`/409, Notfall-Rückruf mit Ergebnis, Aufgaben, Kunde/Lieferung/Rezept/Versorgung, Verlauf + interne Notizen + Kunden-Nachricht). Migration `0025_admin_app`.

**Abnahme §8:** 1 ✓ (30-s-Polling), 2 ✓ (alle Übergänge bis „Archiviert“ in der UI), 3 ✓ (Knöpfe aus `erlaubteSupplyEvents`, Test prüft alle Status), 4 ✓ (409 + verständliche Meldung), 5 ✓ (Listen ohne Rezeptdaten, Detail mit `@AuditRead`), 6 ✓ für alle Abläufe per Testing Library/Tastatur; axe ohne Verstöße auf allen Seiten in den Komponententests.

**Noch offen / bewusst nicht gemacht:**
- Manueller Screenreader-Durchgang (NVDA, VoiceOver) und Prüfung bei 200 % Zoom im echten Browser — automatisiert nur axe in jsdom (ohne Farbkontrast).
- Playwright-E2E im echten Browser (stattdessen: Komponententests + manueller curl-Durchlauf über den Vite-Proxy gegen echtes Backend).
- Fehlversuchs-Sperre nur im Speicher (reicht für eine Instanz), kein Schutz gegen Wiederverwendung desselben TOTP-Codes innerhalb von 90 s.
- Admin-Konten per Skript statt in der App (siehe „Betrieb“ unten); kein „Passwort ändern“ in der App.
- Phasen 2–4 (§7).

### Betrieb (Setup finalisiert 2026-10-28)

- **Auslieferung:** `npm run admin:build`, danach liefert das Backend die App selbst unter `https://<api-domain>/admin/` aus (gleiche Domain wie `/api`, strenge CSP, `X-Frame-Options: DENY`, kein Caching von `index.html`). `ADMIN_APP_DIR` für einen anderen Pfad, `ADMIN_APP_DIR=aus` zum Abschalten.
- **Konten:** `npm run backend:admin-anlegen -- <email> "<Name>" <rolle>` mit den Rollen sachbearbeitung, teamleitung, datenschutz und lesend. Das Startpasswort wird einmal ausgegeben und muss sicher übergeben werden. Die 2FA richtet die Person beim ersten Login selbst ein. `--deaktivieren <email>` beendet den Zugang sofort. `backend:admin-2fa-zuruecksetzen -- <email>` setzt den zweiten Faktor zurück, wenn das Handy verloren ist.
- **Geheimnisse:** `ADMIN_JWT_SECRET` signiert die Sitzungen und verschlüsselt die 2FA-Geheimnisse. Wird es rotiert, müssen alle Admins ihre 2FA neu einrichten.
- **Geprüft:** Produktionsbuild über das Backend im echten Chrome (Arbeitskorb, Versorgungsdetail), keine Konsolenfehler und keine CSP-Verstöße. Rollenrechte geprüft: Sachbearbeitung darf keine Löschanträge sehen (403), nach der Deaktivierung gibt es sofort 401.
