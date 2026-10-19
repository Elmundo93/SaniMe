# Katalogplan — SaniMe Katalog & Discovery

Quelle: `work/worknew/NoisyKatalogplan.md` (codebase-unabhängiges Architektur-/UX-Konzept).
Dieser Plan übersetzt das Konzept auf die **bestehende** Codebase (Stand 2026-10-19, `main` @ `e572442` + uncommitted Start-Tabs-Umbau).
Grundregel: Wo das Konzept etwas vorgibt, das die Codebase/CLAUDE.md bereits anders festgelegt hat, gilt die Codebase — das Konzept wird *in* deren Mustern umgesetzt, nicht daneben.

---

## 0. Ausgangslage (was es schon gibt)

| Bereich | Bestand | Datei(en) |
|---|---|---|
| Katalog-Screen | Eine flache Liste: Suchfeld (`FormField`), horizontale Kategorie-Chips, `ProduktKarte` + „Diese Versorgung wählen“-Button **unter jeder Karte**. Kein Detail-Screen. | `app/katalog/index.tsx`, `app/katalog/_layout.tsx` |
| Einstiege | Dashboard-Leerzustand („Ohne Rezept? Katalog durchsuchen“), `/einstieg`-Option, Fallback aus `krankheitsbild-empfehlung.tsx` | `app/(app)/(start)/dashboard.tsx`, `app/einstieg/index.tsx` |
| Produktauswahl → FSM | `useProduktAuswahlDispatch('katalog')` startet Session, wählt `KATALOG_PRODUKT_VORGEMERKT` (HiMi) vs. `KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT`, merkt bei fehlender Einwilligung `pendingEinstiegEvent` vor | `hooks/useProduktAuswahlDispatch.ts` |
| API (App) | `listCategories`, `listProducts({categoryId, q})`, `getProduct(id)` — alle `auth: false` | `lib/api/catalog.ts` |
| API (Backend) | `GET /catalog/categories` (→ `{id,name}`), `GET /products?categoryId&q`, `GET /products/:id` — öffentlich, gemappt via `toProdukt` | `apps/backend/src/modules/catalog/**` |
| Suche | `ILIKE '%q%'` auf `name`/`description` — keine Synonyme, keine Fehlertoleranz, keine Umlaut-Normalisierung | `products.repository.ts` |
| Datenmodell | `catalog_categories` (flach, `krankheitsbild_id`), `products` (`hilfsmittelnummer`, `features` jsonb, `requires_approval`), `manufacturers`, `suppliers`, `supplier_products` (**Preis = `customer_copay_cents`, `availability`, `delivery_time_days`**) | `apps/backend/src/db/schema/catalog.schema.ts` |
| Taxonomie | `KRANKHEITSBILD_KATALOG` (8 Einträge, Synonyme), `matcheKrankheitsbild()` — statische Domain-Daten, von App + Backend geteilt | `packages/@sanime/domain/krankheitsbild.ts` |
| Sprache | `useSprachEingabe()` — on-device (`requiresOnDeviceRecognition: true`), Transkript nur im React-State, Permission erst beim Tap; **fest auf Krankheitsbild-Matching verdrahtet** | `lib/voice/krankheitsbildSpracherkennung.ts`, `components/ui/MicButton.tsx` |
| Seed | 2 Kategorien („Rollstuhl“, „Selbstzahler-Hilfsmittel (Platzhalter)“), 3 Produkte, keine Bilder | `apps/backend/src/db/seed/catalog.seed.ts` |

Das Konzept ist also kein Greenfield: die Katalog-Engine existiert als Kern, es fehlen Hierarchie, Detailseite, echte Suche, Discovery, Filter, Zubehör.

---

## 1. Abgleich Konzept ↔ Codebase

### 1.1 Übernommen (nicht im Konflikt, fehlt bisher)

- Drei gleichwertige Zugänge auf der Katalog-Startseite: **Suche (mit Mikrofon) → „Wobei brauchst du Hilfe?“ → Kategorien**, in dieser Reihenfolge.
- Sieben nutzerfreundliche Hauptkategorien, **max. zwei Ebenen** bis zur Produktliste, Feindifferenzierung über Filter.
- Progressive Disclosure: Liste = Nutzen/Preis/Verfügbarkeit; HiMi-Nr., Hersteller-Artikelnummer, technische Daten erst auf der Detailseite (aufklappbar).
- Produktdetailseite mit fester Hierarchie (Übersicht → „Passt das zu mir?“ → Zubehör → Technische Infos → Häufige Fragen).
- Deterministische Suche (Ebene 1): Synonyme, Fehlertoleranz, Kategoriezuordnung, Suchvorschläge.
- Transkript vor der Suche sichtbar + editierbar (deckt sich mit CLAUDE.md „derived output is never final“).
- Kontextabhängige Filter mit Alltagssprache („Gewicht des Rollators“ statt „Eigengewicht“), jederzeit zurücksetzbar, bleiben beim Zurücknavigieren erhalten.
- Komplementärketten (Zubehör / Ersatzteile / Dienstleistungen) mit Kompatibilitätsprüfung.
- Kennzeichnung nicht bestellbarer Produkte; „Keine Treffer“ mit konkreten Alternativen.
- Trennung **Catalog Engine** (Daten) vs. **Discovery Engine** (Interpretation von Text/Sprache/Szenarien) über dieselbe Datenbasis.
- Accessibility ab Phase 1, nicht erst in der QA-Phase.

### 1.2 Angepasst an die Codebase (Konzept-Vorgabe ≠ Bestand → Bestand gewinnt)

| Konzept sagt | Codebase gibt vor | Umsetzung |
|---|---|---|
| Neue Hauptnavigation mit 4 Tabs (Entdecken / Meine Versorgung / Merkliste / Profil) | Start-Ansicht = `AppHeader` (Glocke · Logo · Zahnrad) + Top-Tabs Versorgungen/Aufgaben/Verlauf + schwebender `CameraButton` → `/einstieg`. Katalog-Drilldown ist bewusst ein **Push-Stack**, kein Modal. | **Entschieden (F1):** Keine neue Bottom-Navigation, sondern der **mittlere Top-Tab „Aufgaben“ wird zu „Entdecken“** (Katalog-Start). Aufgaben öffnet künftig als **Modal über die Glocke**. „Meine Versorgung“ = Versorgungen-Tab, „Profil“ = Einstellungen (Zahnrad). Merkliste → späte Phase (§7). Details §3.1. |
| Ansprache „Sie“ („Wobei benötigen Sie Hilfe?“) | Gesamte App duzt („Wie möchtest du starten?“) | **„Wobei brauchst du Hilfe?“** — alle Texte im Du. |
| Fließtext 17–18 pt | `@sanime/design-system`: `typography.body` = 17/24, `D.font.lg` = 17 | Bestehende Tokens nutzen, **keine neuen Größen**. Neue Katalog-Screens verwenden für Lesetext `typography.body`, nicht `D.font.sm` (13) wie die heutige Liste. Mikrotext (`11`) nur für Labels, nie für inhaltstragenden Text. |
| Touchflächen 48 × 48 | CLAUDE.md: 44 × 44 Pflicht; bestehende Buttons 52 hoch, Chips `minHeight: 44` | 44 bleibt harte Untergrenze, 48 als Zielwert für **neue** Elemente, wo das Layout es hergibt (Kategorie-Karten, Filter-Chips). Bestehende Komponenten nicht umbauen. |
| WCAG 2.2 AA | CLAUDE.md: WCAG 2.1 AA | 2.1 AA ist Pflicht; 2.2-Zusätze (Focus Not Obscured, Dragging Alternatives, Target Size Minimum) als zusätzliches Ziel für den Katalog — reine Erweiterung, kein Widerspruch. |
| Ordnerstruktur `features/catalog/{screens,components,hooks,services,types}` | Routen in `app/`, UI in `components/<bereich>/`, Hooks in `hooks/`, Netzwerk in `lib/api/`, Logik als **plain functions** in `lib/` bzw. `@sanime/domain` (Memory: keine Klassen/DI in App-Code, kein neues Workspace-Paket ohne echten Shared-Bedarf) | Mapping in §4. Englische Namen → deutsche Identifier (`KatalogSuchfeld`, `KategorieKarte`, …). |
| `catalogService` / `searchService` / `speechService` als Services | Plain-Function-Module, Hooks | `lib/api/catalog.ts` (erweitert), `@sanime/domain/katalogSuche.ts` (pure Matching-Logik), generalisierter Sprach-Hook. Kein Service-Objekt. |
| Preise, HiMi-Nr., Abrechnung in eigene Strukturen, getrennt vom Produkt | Preis/Verfügbarkeit/Lieferzeit **sind schon getrennt** (`supplier_products`). HiMi-Nr. liegt auf `products.hilfsmittelnummer`, und die **ganze FSM** verzweigt über `Produkt.hilfsmittelNr` (`istAbschlussfaehig`, `*_SELBSTZAHLER_*`-Events). | Angebote bleiben in `supplier_products`. **HiMi-Nr. bleibt auf `products`** — ein Herauslösen bringt jetzt keinen Nutzen und würde FSM/Backend-Guards umbauen. `toProdukt()` bleibt die einzige Naht; falls später nötig, wird dort umgemappt. |
| Spracheingabe → SearchService (Volltext + Semantik) | DSGVO-Regel: Transkript/Audio verlassen **nie** das Gerät; nur die aufgelöste, vom Nutzer bestätigte ID wird gesendet. Kein Cloud-NLP/LLM „by design“. | Transkript wird **on-device** gegen die Domain-Taxonomie (Synonyme/Bedarfe/Kategorien) aufgelöst. An das Backend geht nur, was der Nutzer nach Korrektur bestätigt — idealerweise eine aufgelöste Bedarfs-/Kategorie-ID oder ein normalisierter Produktbegriff, nicht der rohe Satz. Details §5.3. |
| Semantische Bedarfserkennung (Ebene 2) | Kein LLM-Call vorgesehen | Nur als **Naht** vorsehen (`findeTreffer()` ist austauschbar), nicht bauen. Aktivierung bräuchte eigene DSGVO-Prüfung. |
| Eine Karte mit Aktion „Produkt ansehen“ | Heute: „Diese Versorgung wählen“ unter **jeder** Karte (mehrere Primär-CTAs pro Screen, verstößt gegen CLAUDE.md „one primary CTA per screen“) | Karte als Ganzes tappbar → Detailseite. Die einzige Primär-CTA „Diese Versorgung wählen“ wandert auf die Detailseite. |
| Fehlermeldungen verständlich mit Lösung | Bereits Regel (CLAUDE.md, deutsche konkrete Next-Steps) | Unverändert anwenden. |

### 1.3 Zurückgestellt / bewusst nicht übernommen

- **Merkliste** — kein Backend-Konzept dafür, und eine Merkliste aus z. B. Inkontinenzartikeln ist faktisch Gesundheitsdatum. Erst in Phase 6, nur lokal, verschlüsselt (siehe §7).
- **Produktvarianten im Bestellprozess** — `OnboardingSession.selectedSupply` arbeitet auf Produkt-Ebene. Varianten werden zunächst nur für Zubehör-Kompatibilität modelliert, nicht bestellt.
- **„Frage zu diesem Produkt stellen“ (Nutzer-Fragen)** — entfällt. Stattdessen kuratierte Q&A-Bibliothek (F3, §4.5, Phase 5a).
- **KI-Versorgungsberatung** — nur Architektur-Naht.

---

## 2. Informationsarchitektur

### 2.1 Kategorien (zwei Ebenen)

Die sieben Hauptkategorien des Konzepts werden **Platzhalter-Seed-Daten** (CLAUDE.md: keine echten Hersteller-/Preis-/HiMi-Daten vortäuschen — die Kategorienamen selbst sind generisch und unkritisch, Produkte bleiben „(Platzhalter)“):

| Hauptkategorie (slug) | Unterkategorien |
|---|---|
| Mobil bleiben (`mobil-bleiben`) | Rollatoren, Rollstühle, Gehhilfen, Rampen |
| Zuhause leichter leben (`zuhause`) | Greifhilfen, Anziehhilfen, Esshilfen, Aufstehhilfen, Lese- & Sehhilfen |
| Bad & Toilette (`bad-toilette`) | Duschhilfen, Badewannenhilfen, Toilettenhilfen |
| Pflege & Schlafen (`pflege-schlafen`) | Pflegebetten, Matratzen, Lagerung, Transferhilfen |
| Gesundheit & Wohlbefinden (`gesundheit`) | Bandagen, Kompression, Messgeräte, Atemtherapie, Wundversorgung |
| Hygiene & Inkontinenz (`hygiene-inkontinenz`) | Inkontinenzartikel, Hautpflege, Hygiene |
| Bewegung & Training (`bewegung-training`) | Bewegungstrainer, Therapiegeräte, Trainingszubehör |

Abgleich mit `KRANKHEITSBILD_KATALOG` (Entscheidung F6):
- **Atemhilfen** → Unterkategorie „Atemtherapie“, **Wundversorgung** → „Wundversorgung“ (beide unter „Gesundheit & Wohlbefinden“), **Sehhilfen** → „Lese- & Sehhilfen“ (Lupen, Leselampen — Sanitätshaus-Sortiment, keine Brillen). Die sieben Hauptkategorien bleiben unverändert.
- **Hörhilfen** werden aus der Taxonomie **entfernt**: Hörgeräte versorgt der Hörakustiker, nicht das Sanitätshaus — ein Eintrag, der nie Produkte liefern kann, ist eine Sackgasse. `findeKrankheitsbild()` muss mit unbekannten IDs (Altdaten) weiter `undefined` liefern, nicht werfen.
- **Invariante (Test):** Jede `KRANKHEITSBILD_KATALOG`-ID und jeder `BEDARF_KATALOG.kategorieSlugs`-Eintrag muss auf mindestens eine geseedete, aktive Kategorie zeigen — Backend-Test gegen die Seed-Daten. Eine leere Empfehlung wird damit zum Testfehler statt zum Laufzeit-Zustand. Fällt trotzdem ein Treffer leer aus (z. B. alle Produkte deaktiviert), zeigt die App verknüpfte Ratgeber-Einträge + Kategorien statt einer leeren Liste.

Migration des Bestands:
- „Rollstuhl“ → Unterkategorie „Rollstühle“ unter „Mobil bleiben“ (gleiche UUID behalten, nur `parent_id`/`slug`/`name` setzen — `krankheitsbild_id = 'mobilitaet'` bleibt).
- „Selbstzahler-Hilfsmittel (Platzhalter)“ ist **keine fachliche Kategorie** (Selbstzahler ist eine Eigenschaft des Produkts = fehlende HiMi-Nr.). Der Gehstock wandert nach „Mobil bleiben › Gehhilfen“, die Kategorie wird deaktiviert/entfernt.
- Produkte hängen **immer an einer Unterkategorie** (Blatt). Hauptkategorien sind reine Navigation.

`listProductsForKrankheitsbild()` muss weiter funktionieren: `krankheitsbild_id` darf auf Haupt- **oder** Unterkategorie stehen; der Lookup löst Hauptkategorien auf ihre Kinder auf.

### 2.2 Bedarfe („Wobei brauchst du Hilfe?“)

Das Konzept nennt sie *Scenarios*. Umsetzung nach dem **bewährten Krankheitsbild-Muster**: statische Domain-Daten in `@sanime/domain`, von App und Backend identisch importiert, kein DB-Entity.

```ts
// packages/@sanime/domain/bedarf.ts
export interface Bedarf {
  id: string;                 // 'aufstehen', 'duschen', 'gehen', …
  titel: string;              // „Leichter aufstehen“
  beispielsatz: string;       // „Ich suche etwas, das mir beim Aufstehen hilft.“
  stichworte: string[];       // für on-device Matching (Text + Sprache)
  kategorieSlugs: string[];   // → Unterkategorien, NICHT UUIDs
  icon: string;               // Feather-Name, wie Krankheitsbild.icon
}
export const BEDARF_KATALOG: Bedarf[] = [ /* Platzhalter */ ];
```

Wichtig — **Bedarf ≠ Krankheitsbild**: Bedarfe beschreiben Alltagssituationen („aufstehen“, „duschen“), keine Diagnosen. Das passt zur Konzept-Regel „keine Diagnose stellen, keine medizinische Eignung behaupten“ und ist datenschutzärmer.

**Entschieden (F2, überarbeitet): Bedarf und Krankheitsbild werden *ein* Discovery-Weg — keine technische Trennung.**
Die Trennung war nur nötig, weil die Krankheitsbild-Erfassung heute als eigener FSM-Pfad *vor* der Produktwahl eine Session mit Einwilligung startet. Stattdessen gilt jetzt dieselbe Regel wie für den Katalog: **Entdecken ist immer sessionlos; die Einwilligung wird eingeholt, sobald ein Prozess beginnt** (Produkt wählen, Rezept scannen) — siehe §2.3.

| | Vorher | Neu |
|---|---|---|
| Oberfläche | Bedarfe im Katalog, Krankheitsbild separat in `/einstieg` + `app/scan/krankheitsbild*.tsx` | **Ein Block „Wobei brauchst du Hilfe?“** im Entdecken-Tab: Bedarfskarten **und** Krankheitsbild-Karten (zwei Gruppen, z. B. „Im Alltag“ / „Bei Erkrankungen“) + Suche/Sprache über beide |
| Session/Einwilligung | Krankheitsbild-Pfad: ja, vor der Auswahl | erst bei Produktwahl (bestehender `pendingEinstiegEvent`-Mechanismus bzw. dauerhafte Einwilligung) |
| Empfehlung | `KRANKHEITSBILD_AUSGEWAEHLT` → Server berechnet `produkte` in der Session | `GET /products?krankheitsbildId=…` bzw. `?bedarfId=…` — Server bleibt Autorität über die Empfehlung (gleiche `listProductsForKrankheitsbild`-Logik), aber ohne Session |
| Produktwahl | `KRANKHEITSBILD_PRODUKT_*`-Events | `KATALOG_PRODUKT_*`-Events, optional mit `krankheitsbildId` als Kontext (für Admin-Sichtbarkeit, ersetzt `ausgewaehltesKrankheitsbildId`) |

Folgen:
- `/einstieg` „Krankheitsbild beschreiben“ → führt in den Discovery-Block (Tab bzw. `/katalog`), startet **keine** Session mehr.
- Die FSM-Zustände `KRANKHEITSBILD_ERFASSUNG`/`_EMPFEHLUNG`, ihre Events (`KRANKHEITSBILD_STARTEN`, `_AUSGEWAEHLT`, `_PRODUKT_*`, `ZURUECK_KRANKHEITSBILD`) und `eintrittspfad: 'KRANKHEITSBILD_SELBSTZAHLER'` werden überflüssig und in einer Aufräum-Phase (4b) entfernt — mit Migration für Sessions, die gerade in diesen Zuständen stehen (→ zurück auf `LEISTUNGSUEBERSICHT`), plus `STATUS_META`, `SCHRITT_REIHENFOLGE`, Analytics-Mapping, Backend-`patchInner`-Zweig, Tests. Bis dahin bleiben sie unbenutzt, aber funktionsfähig.
- `app/scan/krankheitsbild.tsx`/`-empfehlung.tsx` gehen in den Katalog-Hilfe-Screens auf (`app/katalog/hilfe/[typ]/[id].tsx`, §2.4); deren Bestätigungsbanner („Meintest du …?“) und `MicButton`-Logik werden übernommen.
- Bedarfs- und Krankheitsbild-Karten bleiben **inhaltlich** getrennt beschriftet (Alltag vs. Erkrankung); die App stellt keine Diagnose und behauptet keine Eignung.
- Krankheitsbild-IDs im Query sind sensibel → gleiche Masking-Regel wie Suchbegriffe (§4.4).

### 2.3 Einwilligung vor jedem Prozess — einmal, länger verbindlich

Entscheidung (F2): Die AGB/Datenschutz-Einwilligung wird **vor dem ersten Prozess** eingeholt und gilt danach **dauerhaft, solange `AGB_VERSION`/`DATENSCHUTZ_VERSION` (`constants/legal.ts`) unverändert sind**. Bei einer Versionsänderung wird erneut gefragt; Widerruf in den Einstellungen.

> Ändert eine bewusst dokumentierte Entscheidung: CLAUDE.md sagt heute, jede neue Versorgung holt die Einwilligung erneut ein („deliberate choice … don't optimize without checking first“). Das ist hiermit geprüft und geändert — CLAUDE.md im selben Zug anpassen. Gehört in die laufende juristische Prüfung (Art. 9 DSGVO: Gesundheitsdaten-Einwilligung über mehrere Versorgungen).

Umsetzung (passt in das Bestehende):
- `consents` ist append-only und versioniert und kennt `customerId` bereits — die Historie ist also schon da.
- **Neues FSM-Event** `EINWILLIGUNG_UEBERNOMMEN { einwilligungsToken? }`: `WILLKOMMEN → LEISTUNGSUEBERSICHT` mit gesetzten Einwilligungen; Guard: Versionen = aktuelle. Danach greift ein vorgemerktes Event (`pendingEinstiegEvent`) bzw. `WEITER` sofort — Willkommen/Leistungsübersicht werden übersprungen.
- **Server prüft, Client behauptet nur** (Entscheidung F8 — gilt für erkannte Kunden **und** Gäste):
  - Bei der ersten Zustimmung legt der Server zusätzlich einen **Einwilligungs-Grant** an (neue Tabelle `consent_grants`: `id`, `organization_id`, `token_hash`, `customer_id null`, `agb_version`, `datenschutz_version`, `created_at`, `revoked_at null`) und gibt einmalig ein zufälliges `einwilligungsToken` zurück. Die App speichert es in SecureStore (`lib/secureStorage.ts`).
  - Das Token berechtigt **ausschließlich** zur Übernahme der Einwilligung — es ist kein Session-Secret und öffnet keine Daten (Least Privilege; deshalb nicht das alte Session-Secret wiederverwenden).
  - Erkannte Kunden: Grant wird beim Claim per `customerId` verknüpft, die Übernahme funktioniert dann auch geräteübergreifend ohne Token.
  - Übernahme nur, wenn Grant existiert, nicht widerrufen ist und die Versionen den aktuellen entsprechen. Der Server schreibt neue `consents`-Zeilen für die neue Session mit `uebernommen_von_grant_id` und eigener `ipAddress` — nie eine erfundene neue Zustimmung.
  - Widerruf in den Einstellungen setzt `revoked_at` (alle Grants des Kunden bzw. des Tokens) und löscht das lokale Token. Grants laufen in `data-export`, `deletion-requests` und `retention` mit.
- Kein/ungültiger Grant oder abweichende Version → normaler Ablauf über `leistungsuebersicht.tsx` (und neuer Grant).
- Die Leistungsübersicht (Prozessvisual, Beruhigung) bleibt beim ersten Mal; danach nicht mehr.

Referenzierung über **`slug`** statt UUID, damit statische Domain-Daten stabil auf DB-Kategorien zeigen können (neue Spalte `catalog_categories.slug`, unique pro Organisation).

### 2.4 Routen

Der Katalog-Start ist eine Komponente (`components/katalog/KatalogStart.tsx`), die an **zwei** Stellen gerendert wird:
- `app/(app)/(start)/entdecken.tsx` — der neue mittlere Tab (Hauptzugang).
- `app/katalog/index.tsx` — als eigenständige Route für Einstiege aus Vollbild-Modals (`/einstieg`, `krankheitsbild-empfehlung.tsx`), aus denen nicht sauber in einen Tab der Start-Ansicht gesprungen werden kann.

Alle Drilldown-Routen bleiben im Push-Stack `app/katalog/` und werden über die Start-Ansicht (bzw. das Modal) geschoben:

| Route | Inhalt | Primäre Aktion |
|---|---|---|
| `(start)/entdecken.tsx` / `katalog/index.tsx` | Katalog-Start: `KatalogSuchfeld` (+ Mikrofon) · „Wobei brauchst du Hilfe?“ (Bedarfe + Krankheitsbilder, je 3–4 Karten, „Alle anzeigen“) · 7 `KategorieKarte` | keine erzwungene — drei gleichwertige Wege |
| `hilfe/[typ]/[id].tsx` (`typ` = `bedarf` \| `krankheitsbild`) | Ersetzt die Krankheitsbild-Screens (`app/scan/krankheitsbild*.tsx`): passende Unterkategorien/Produkte + verknüpfte Ratgeber-Einträge | Produkt öffnen |
| `ratgeber/[id].tsx` | Ein Eintrag der Q&A-Bibliothek (§4.5) mit verknüpften Produkten | verknüpftes Produkt öffnen |
| `suche.tsx` | Trefferliste zu Suchtext/Transkript, Vorschläge, Null-Treffer-Alternativen | Produkt öffnen |
| `kategorie/[id].tsx` | Hauptkategorie → Unterkategorien; Unterkategorie → Produktliste mit kontextabhängigen Filtern | Produkt öffnen |
| `produkt/[id].tsx` | Produktdetailseite (§3.3) | **„Diese Versorgung wählen“** (`useProduktAuswahlDispatch`) |

- `app/katalog/_layout.tsx` bleibt Push-Stack, bekommt aber explizite `<Stack.Screen>`-Einträge je Datei (Konvention aus `app/scan/_layout.tsx`).
- **Kein `starten()`** in irgendeinem dieser Screens außer über die Detail-CTA — Browsing bleibt sessionlos (bestehende Regel).
- `?categoryId=`-Param der heutigen `index.tsx` (Fallback aus `krankheitsbild-empfehlung.tsx`) → auf `kategorie/[id]` umleiten.
- Nach dem Anlegen neuer Routen typed routes regenerieren (CLAUDE.md-Gotcha zu `.expo/types/router.d.ts`).

---

## 3. UX-Umsetzung

### 3.1 Erreichbarkeit: „Entdecken“-Tab + Aufgaben als Modal (F1)

**Tab-Umbau** (`app/(app)/(start)/`):
- Tabs: **Versorgungen · Entdecken · Verlauf**. `aufgaben.tsx` wird zu `entdecken.tsx` (rendert `KatalogStart`), Icon z. B. `compass` oder `search`, Titel „Entdecken“. `initialRouteName` bleibt `dashboard`.
- Der Badge-Zähler am Tab entfällt — offene Aufgaben zeigt allein die Glocke (`AppHeader` hat den Zähler schon, `benachrichtigungen`).

**Aufgaben als Modal**:
- Inhalt aus `(start)/aufgaben.tsx` nach `app/(app)/aufgaben.tsx` verschieben und in `app/(app)/_layout.tsx` als `<Stack.Screen name="aufgaben" options={{ presentation: 'modal' }} />` registrieren (Sheet-Modal mit Wisch-zum-Schließen; kein `fullScreenModal`, weil es eine Übersicht ist, kein Prozess).
- Modal-Kopf mit Titel „Aufgaben“ und Schließen-Button (≥ 44 pt, `accessibilityLabel="Aufgaben schließen"`), weil der Wisch-Geste allein nicht barrierefrei ist.
- Aufrufer umstellen: Glocke in `(start)/_layout.tsx` (`router.navigate('/aufgaben')` → `router.push('/aufgaben')`) und der Aufgaben-Link in `(start)/dashboard.tsx` (Zeile ~55).
- Die Aufgaben-Inhalte nutzen heute `StartTabScroll` (mit FAB-Abstand) — im Modal gibt es keinen Kamera-Button, also eine Variante ohne `fabAbstand`.
- Lade-/Leerzustände (`LadeSkelett`, `LeerHinweis`, Gast-Leerzustand) unverändert übernehmen. `versorgungStore` wird weiter vom `(start)/_layout.tsx` geladen; das Modal liest nur.

**Fallstricke im Entdecken-Tab**:
- Die Tabs sind **swipebar** (`swipeEnabled: true`). Horizontal scrollende Bereiche (heutige Kategorie-Chips) kollidieren mit der Pager-Geste → Katalog-Start ohne horizontale Scroller gestalten: Bedarfe und Kategorien als vertikales Raster/Liste. Falls doch nötig, nur mit klarer Swipe-Priorität testen (idb + echtes Gerät).
- Der schwebende `CameraButton` überdeckt den unteren Rand → `StartTabScroll` (mit FAB-Abstand) als Hülle verwenden; WCAG 2.2 „Focus Not Obscured“ beachten.
- Eine aktive Suche im Tab bleibt beim Tabwechsel erhalten (`lazy: false`, Tabs bleiben gemountet) — gewünscht, entspricht „Filter bleiben erhalten“.

**Übrige Einstiege**:
- `/einstieg` „Katalog durchsuchen“ → bleibt `/katalog` (Modal-Kontext, siehe §2.4).
- Dashboard-Leerzustand „Ohne Rezept? Katalog durchsuchen“ → `router.navigate('/entdecken')` (Tab statt Push).
- Der `CameraButton` bleibt unverändert der zentrale Einstieg für den Rezeptscan (Konzept fordert das ausdrücklich).
- CLAUDE.md (Routing-Abschnitt zu `(start)/`) nach dem Umbau aktualisieren: Tab-Liste, Glocke → Modal.

### 3.2 Produktliste & Karte

Neue Komponente `components/produkt/KatalogProduktKarte.tsx` statt Umbau der geteilten `ProduktKarte`:
- `ProduktKarte` dient in `versorgungen.tsx` (VERSORGUNGSAUSWAHL) der **Auswahl** — dort sind Auswahlkreis und HiMi-Nr. richtig. Im Katalog verletzt genau das die Progressive Disclosure.
- `KatalogProduktKarte`: Bild (oder Platzhalter-Icon wie heute), Name, **ein Satz Nutzen** (`kurzbeschreibung`), Kostenhinweis, Verfügbarkeit; ganze Karte = ein Touch-Target mit `accessibilityRole="button"` und zusammengefasstem `accessibilityLabel` (Name, Kostenhinweis, Verfügbarkeit), Hint „Öffnet die Produktdetails“.
- Kostenhinweis statt HiMi-Nr.:
  - HiMi-Produkt: „Kostenübernahme durch die Krankenkasse möglich – mit Rezept“ (+ ggf. „Gesetzl. Zuzahlung ab …“).
  - Selbstzahler: Preis „ab X,XX €“ aus `eigenanteil` (Formatierung wie `ProduktKarte`: `toFixed(2).replace('.', ',')`).
- Verfügbarkeit aus `supplier_products.availability`; „Derzeit nicht bestellbar“ deutlich, Karte bleibt ansehbar, CTA auf der Detailseite deaktiviert mit Begründung.

### 3.3 Produktdetailseite (`produkt/[id].tsx`)

Feste Reihenfolge, `ScrollContainer`, Abschnitte als `Section`/`SectionHeader` (vorhandene Komponenten):

1. **Übersicht** — Galerie (horizontales Paging, jedes Bild mit `accessibilityLabel`), Name, 3–4 wichtigste Merkmale (`merkmale`), Kostenhinweis, Verfügbarkeit/Lieferzeit.
2. **„Passt das zu mir?“** — Einsatzbereich, Abmessungen, Belastbarkeit, Voraussetzungen in Alltagssprache (aus strukturierten `attributes`, §4.2). Keine Eignungsbehauptung („eignet sich für Menschen mit …“) — nur Fakten.
3. **Passendes Zubehör** — `PassendesZubehoer` gruppiert nach Zubehör / Ersatzteile / Dienstleistungen (ab Phase 5, vorher ausgeblendet, nicht leer gezeigt).
4. **Technische Informationen** — aufklappbar (`accessibilityState={{ expanded }}`): Hersteller, Artikelnummer, **HiMi-Nr. falls vorhanden**, technische Daten, Dokumente.
5. **Häufige Fragen** — verknüpfte Einträge der Q&A-Bibliothek (§4.5), max. 3 sichtbar + „Alle Fragen“; keine Nutzer-Fragen-Eingabe.

Eine Primär-CTA, sticky am unteren Rand: **„Diese Versorgung wählen“** → `useProduktAuswahlDispatch('katalog')` (unverändert — die HiMi/Selbstzahler-Entscheidung prüft weiterhin das Backend).

### 3.4 Filter

- Filterdefinitionen **statisch in `@sanime/domain`** (`katalogFilter.ts`), keyed by Unterkategorie-`slug`, mit Alltagssprach-Label, Typ (`bool` / `bereich` / `auswahl`) und Attribut-Schlüssel. Beispiel Rollatoren: Einsatzort (Innen/Außen), „Gewicht des Rollators“, „Bis zu welchem Körpergewicht“, „Zusammenklappbar“, Preis.
- Serverseitige Filterung über `GET /products?categoryId=…&filter[faltbar]=true&…` gegen `products.attributes` (jsonb), validiert gegen dieselbe Domain-Definition (unbekannte Schlüssel → 400).
- Filterzustand: lokaler `useState` im Listen-Screen; da `produkt/[id]` per Push darüber liegt, bleibt er beim Zurück erhalten. Zusätzlich in Router-Params spiegeln, damit Deep Links/Neustart ihn behalten. **Kein neuer Zustand-Store** nötig.
- „Filter zurücksetzen“ immer sichtbar, sobald ein Filter aktiv ist; aktive Filter als entfernbare Chips mit Label „Filter X entfernen“.
- Filter-UI als Bottom-Sheet/eigener Screen erst, wenn > 3 Filter; sonst Inline-Chips (bestehender Chip-Stil aus `app/katalog/index.tsx`).

### 3.5 Accessibility (ab Phase 1)

- Dynamic Type: **kein** pauschales `maxFontSizeMultiplier` auf Inhaltstext; Begrenzungen nur für Chrome (wie bisher bei `StartTabBar`/`AppHeader`). Karten/Buttons mit `minHeight` statt fester `height`, damit bei großen Schriften nichts abgeschnitten wird (heutiges `waehlenButton` hat `height: 52` — in neuen Komponenten vermeiden).
- Reduzierbare Animationen: `lib/einblenden.ts` explizit mit `.reduceMotion(ReduceMotion.System)` absichern (zentral, wirkt dann app-weit); `MicButton`-Atmen bei Reduce Motion abschalten.
- Icon-only-Elemente (Mikrofon) mit sichtbarem Textlabel („Sprechen“) **und** `accessibilityLabel`.
- Fokusreihenfolge = visuelle Reihenfolge (Suche → Bedarfe → Kategorien); nach Spracheingabe Fokus auf das editierbare Transkript (`AccessibilityInfo.setAccessibilityFocus`).
- Ladezustände mit `accessibilityLiveRegion`/Announcement („12 Produkte gefunden“).
- Kontrast: nur Design-System-Farben; `inkTertiary` nicht für inhaltstragenden Text.
- Verifikation: VoiceOver per Hand + `idb ui describe-all` (CLAUDE.md „Manual/interactive testing“) je Phase, nicht erst in Phase 7.

### 3.6 Keine unnötigen Interaktionen

Bereits erfüllt und beizubehalten: keine Registrierung zum Stöbern (öffentliche Endpoints), kein Standort, Mikrofon-Permission erst beim Tap. Neu: keine Bestätigungsdialoge im Katalog; Null-Treffer zeigt immer (a) Schreibvorschlag/Synonym, (b) passende Bedarfe, (c) alle Kategorien, (d) passende Ratgeber-Einträge.

---

## 4. Technische Architektur

### 4.1 Mapping der Konzept-Komponentenstruktur

| Konzept | SaniMe-Ort |
|---|---|
| `screens/*` | `app/katalog/{index,suche,hilfe/[typ]/[id],kategorie/[id],produkt/[id],ratgeber/[id]}.tsx` |
| `CatalogSearchBar` + `VoiceSearchButton` | `components/katalog/KatalogSuchfeld.tsx` (nutzt `FormField`-Optik + vorhandenen `MicButton`) |
| `CategoryCard` | `components/katalog/KategorieKarte.tsx` |
| — (neu) | `components/katalog/BedarfKarte.tsx` (Optik angelehnt an `EinstiegOption`) |
| `ProductCard` | `components/produkt/KatalogProduktKarte.tsx` (neben bestehender `ProduktKarte`) |
| `ProductFilters` | `components/katalog/ProduktFilter.tsx` |
| `ProductGallery` | `components/produkt/ProduktGalerie.tsx` |
| `RelatedProducts` | `components/produkt/PassendesZubehoer.tsx` |
| `useCatalog` | entfällt — Screens rufen `lib/api/catalog.ts` direkt (wie heute) |
| `useProductSearch` | `hooks/useKatalogSuche.ts` (Debounce, Abbruch, Laden/Fehler — Logik aus heutiger `index.tsx` extrahiert) |
| `useVoiceSearch` / `speechService` | `lib/voice/spracheingabe.ts`: generalisierter `useSpracheingabe({ matcher })` — der heutige Krankheitsbild-Hook geht darin auf (Matcher als Parameter = „austauschbare Schnittstelle“ ohne Klasse) |
| `catalogService` | `lib/api/catalog.ts` (erweitert) |
| `searchService` (Discovery Engine) | `packages/@sanime/domain/katalogSuche.ts` — pure Funktionen, von App (on-device Vorschläge/Sprache) und Backend (Query-Expansion) geteilt |
| `catalog.types.ts` | `Produkt`-Erweiterungen in `packages/@sanime/domain/types.ts`; reine App-Anzeigetypen in `types/index.ts` |

### 4.2 Datenmodell (Backend, Drizzle)

Änderungen an `apps/backend/src/db/schema/catalog.schema.ts`, je Phase eine Migration (`npm run backend:db:generate`):

```
catalog_categories
  + parent_id     uuid null  → catalog_categories.id   (max. 2 Ebenen, Service-seitig erzwungen)
  + slug          text not null, unique(organization_id, slug)
  + beschreibung  text null
  + icon          text null   (Feather-Name, wie Krankheitsbild.icon)
  + sort_order    integer not null default 0
  + is_active     boolean not null default true
  (krankheitsbild_id bleibt)

products
  + kurzbeschreibung  text null   (ein Satz Nutzen für die Karte; Fallback: description)
  + artikelnummer     text null   (Hersteller-Artikelnummer, nur Detailseite)
  + attributes        jsonb not null default '{}'   (strukturiert, filterbar: gewichtKg, belastbarkeitKg, faltbar, einsatzort …)
  (features bleibt = Anzeige-Merkmale; hilfsmittelnummer bleibt, siehe §1.2)

product_images            (Phase 1)
  id, organization_id, product_id, storage_key, alt_text not null, sort_order

product_documents         (Phase 5, optional) — Gebrauchsanweisungen etc.

product_variants          (Phase 5)
  id, organization_id, product_id, sku, attributes jsonb, is_active

product_relations         (Phase 5)
  id, organization_id, source_product_id, target_product_id,
  relation_type  text  ('zubehoer' | 'ersatzteil' | 'dienstleistung'),
  source_variant_id uuid null   (null = passt zu allen Varianten)
  unique(source_product_id, target_product_id, source_variant_id)
```

- Alle neuen Tabellen mit `organization_id` + Repositories erben `TenantScopedRepository` (bestehende Regel).
- Preis/Verfügbarkeit bleiben in `supplier_products` — Konzept-Forderung „Preise getrennt vom Produkt“ ist damit bereits erfüllt.
- **Bilder (Entscheidung F5)**: `product_images` kommt schon in Phase 1 ins Schema und die API, damit echte Bilder später ohne Umbau einfließen. Bis echte, lizenzierte Herstellerbilder vorliegen, zeigt die App **keine Fotos**, sondern einen einheitlichen Platzhalter: Kategorie-Icon (`catalog_categories.icon`) auf `accentLight`-Fläche, wie heute in `ProduktKarte`. Keine Stockfotos — sie würden ein konkretes Produkt vortäuschen (CLAUDE.md-Platzhalterregel) und bringen Lizenzpflege. `alt_text` ist Pflichtfeld, sobald Bilder kommen. Öffentliche Katalogbilder gehören **nicht** in den Bucket des `document`-Moduls (dort liegen Gesundheitsdokumente). Eigener öffentlicher Bucket/Prefix in MinIO bzw. später CDN; API liefert fertige URLs. Seed: keine Bilder (Icon-Platzhalter).
- Suche: Migration `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;` + GIN-Trigram-Index auf `name`/`kurzbeschreibung`.

### 4.3 API

Bestehende Endpoints bleiben öffentlich und abwärtskompatibel (Onboarding nutzt `toProdukt` mit):

| Endpoint | Änderung |
|---|---|
| `GET /catalog/categories` | + `parentId`, `slug`, `beschreibung`, `icon`, `sortOrder`; sortiert; nur aktive. Weiterhin keine Tenant-Interna. |
| `GET /products` | + `filter[...]`, + `bedarfId` (löst über `BEDARF_KATALOG.kategorieSlugs` auf), + `limit`/`cursor`; `q` läuft über Domain-Query-Expansion + Trigram (§5). `categoryId` einer Hauptkategorie schließt deren Kinder ein. |
| `GET /products/:id` | liefert Detailform (Bilder, Attribute, Artikelnummer); bei Phase 5 + Zubehör gruppiert. |
| `GET /products/:id/related` | Phase 5, optional `variantId`. |

`Produkt` (`@sanime/domain/types.ts`) nur um **optionale** Felder erweitern (`kurzbeschreibung?`, `bilder?`, `verfuegbar?`, `attribute?`) — `OnboardingSession.selectedSupply`/Events bleiben kompatibel. Für die Detailansicht ggf. ein eigener `ProduktDetail extends Produkt`-Typ statt `Produkt` aufzublähen. `toProdukt()` bleibt die einzige Mapping-Stelle.

### 4.4 Datenschutz-Anforderungen (aus CLAUDE.md abgeleitet, im Konzept nur angedeutet)

1. **Suchbegriffe sind potenziell Gesundheitsdaten** („inkontinenz“, „nach OP“). Sie dürfen nicht geloggt, nicht in Analytics und nicht persistiert werden.
   - Befund: `AllExceptionsFilter` gibt `request.url` (inkl. Query) zurück und meldet 5xx an Sentry; Sentry/OTel-HTTP-Instrumentierung erfassen URLs ggf. mit Query-String. → `q`/Filter-Parameter in Sentry `beforeSend`/Breadcrumbs und OTel-Span-Attributen **maskieren**, bevor die Suche ausgebaut wird.
2. **Sprach-Transkript bleibt on-device** (bestehende Regel). Siehe §5.3.
3. **Kein Katalog-Tracking im MVP.** Falls später gewünscht: neue geschlossene Union analog `OnboardingAnalyticsEvent`, ohne Suchbegriffe, ohne Produkt-/Kategorie-IDs (ein Produktaufruf „Inkontinenzartikel“ ist eine Gesundheitsinferenz).
4. Merkliste/zuletzt angesehen: nur lokal, `expo-secure-store` (via `lib/secureStorage.ts`), nie AsyncStorage im Klartext, nie synchronisiert ohne explizite Entscheidung.
5. Die Q&A-Bibliothek ist redaktioneller Inhalt ohne Nutzereingaben — keine personenbezogenen Daten, daher kein Anschluss an Export/Löschung nötig.

### 4.5 Q&A-Bibliothek („Ratgeber“) — F3, überarbeitet

Entscheidung: **Keine Nutzer-Fragen-Eingabe.** Die meisten Fragen sind bereits öffentlich beantwortet; SaniMe trägt die relevanten Inhalte zusammen und bietet sie als kuratierte **Q&A-Bibliothek** an, verknüpft mit Produkten, Kategorien, Bedarfen und Krankheitsbildern. Das entfernt den gesamten Sensibel-Daten-Aufwand (privater Fragentext, Rate-Limit, Export/Löschung, Admin-Inbox) — die Bibliothek ist reiner öffentlicher Katalog-Inhalt wie Produkte.

**Datenmodell** (im bestehenden `catalog`-Modul — gleiche Natur wie Produktdaten, öffentlich, tenant-scoped; kein eigenes Modul nötig):

```
qa_entries
  id, organization_id,
  slug         text  unique(organization_id, slug)
  frage        text not null          -- „Wie stelle ich die Höhe meines Rollators ein?“
  antwort      text not null          -- eigener Text, einfaches Markdown (Absätze, Listen)
  kurzantwort  text null              -- 1–2 Sätze für Listen/Vorschau
  quellen      jsonb not null default '[]'   -- [{titel, url}] — Herkunft, sichtbar am Eintrag
  sort_order, is_published, geprueft_am timestamp null, created_at, updated_at

qa_entry_links                        -- n:m, genau ein Ziel pro Zeile
  qa_entry_id → qa_entries
  product_id  → products        null
  category_id → catalog_categories null   -- gilt für alle Produkte der Kategorie (inkl. Kinder)
  bedarf_id        text null     -- @sanime/domain BEDARF_KATALOG (kein FK, wie krankheitsbild_id)
  krankheitsbild_id text null    -- @sanime/domain KRANKHEITSBILD_KATALOG
  CHECK: genau eine der vier Spalten gesetzt
```

Kategorie-Verknüpfung ist der Hebel für „elegant verknüpft“: Eine Frage wie „Zahlt die Krankenkasse einen Rollator?“ hängt an *Rollatoren* und erscheint automatisch bei jedem Rollator — ohne Pflege pro Produkt. Produkt-Links nur für wirklich produktspezifische Fragen.

**API** (öffentlich, `auth: false`, wie die übrigen Katalog-Reads):

| Endpoint | Zweck |
|---|---|
| `GET /qa?productId=…` | Einträge für ein Produkt: direkte Links + Links seiner Kategorie/Elternkategorie, dedupliziert, sortiert (Produkt vor Kategorie) |
| `GET /qa?categoryId=…` / `?bedarfId=…` / `?krankheitsbildId=…` | Einträge für Kategorie- bzw. Hilfe-Screens |
| `GET /qa?q=…` | Volltextsuche über Frage/Antwort mit derselben `katalogSuche`-Expansion (§5.1) |
| `GET /qa/:slug` | Ein Eintrag + verknüpfte Produkte (als `Produkt`, via `toProdukt`) |

**App**:
- `lib/api/qa.ts` (plain functions), `components/katalog/QaListe.tsx` (aufklappbar, `accessibilityState.expanded`), `app/katalog/ratgeber/[id].tsx`.
- Erscheint auf: Produktdetail (Abschnitt 5), Kategorie-Screens, Hilfe-Screens (`hilfe/[typ]/[id]`), Suchergebnissen (eigene Gruppe „Ratgeber“) und bei **Null-Treffern** als Alternative.
- Lesetext mit `typography.body`, Markdown nur über eine kleine, eigene Render-Funktion (Absätze/Listen) — keine HTML-Darstellung.

**Inhalte & Pflege**:
- Start: Inhalte als versionierte Seed-Datei im Repo (`apps/backend/src/db/seed/qa.seed.ts` + Daten), Upsert per `slug` — kein CMS/Admin-UI nötig. Admin-Pflege später über das bestehende Admin-Modul, falls der Umfang wächst.
- „Frei zugänglich“ ≠ frei übernehmbar: Antworten werden **in eigenen Worten** formuliert, Quellen angegeben, keine wörtlichen Hersteller-/Kassen-Texte (Urheberrecht).
- Keine Heil- oder Wirkversprechen, keine Eignungs- oder Diagnoseaussagen (Heilmittelwerbegesetz; Konzept-Regel). Fester Hinweis am Eintrag: „Allgemeine Information, ersetzt keine ärztliche Beratung.“
- `geprueft_am` sichtbar machen und Einträge mit veralteter Prüfung (z. B. > 12 Monate) für die Redaktion markieren — Kassenregeln ändern sich.
- In der Entwicklung nur Platzhalter-Inhalte (CLAUDE.md-Regel für Katalogdaten gilt analog).

## 5. Suche & Discovery Engine

### 5.1 Ebene 1 — deterministisch (`@sanime/domain/katalogSuche.ts`)

Pure Funktionen, Jest-getestet (co-located `katalogSuche.test.ts`), von App **und** Backend genutzt — gleiche Begründung wie `matcheKrankheitsbild` in der Domain: der Abgleich darf nicht von der Taxonomie abweichen, die er durchsucht.

```ts
normalisiere(text): string            // lowercase, ä→ae/ö→oe/ü→ue/ß→ss, Satzzeichen raus, Füllwörter raus
SYNONYME: Record<string, string[]>     // Konzept-Beispiele (rollator ← gehwagen, laufhilfe, …; duschstuhl ← duschsitz, …), Platzhalter
erweitereSuchbegriffe(text): string[]  // Normalisieren + Synonym-Expansion → Kanonische Begriffe
findeBedarfe(text): Bedarf[]           // Stichwort-Matching gegen BEDARF_KATALOG (gerankt)
schlageVor(text, kategorien): Vorschlag[]  // Autocomplete aus Synonymen, Kategorienamen, Bedarfstiteln
```

- **Suchvorschläge on-device** aus statischen Domain-Daten + gecachten Kategorienamen → beim Tippen geht keine Anfrage pro Tastendruck raus (Privacy + Performance).
- **Backend**: `q` → `erweitereSuchbegriffe()` → `ILIKE ANY` auf erweiterte Begriffe **plus** `word_similarity(unaccent(q), unaccent(name)) > Schwelle` (Tippfehler). Ranking: exakter Treffer > Synonym > Trigram.
- Bestehende Krankheitsbild-Synonyme bleiben, wo sie sind; `matcheKrankheitsbild` kann intern auf `normalisiere()` umgestellt werden (gleiches Verhalten, bessere Umlaut-Toleranz).

### 5.2 Ebene 2 — semantisch (nur Naht)

`findeBedarfe()` ist die Schnittstelle. Eine spätere semantische Implementierung ersetzt sie hinter derselben Signatur. Kein LLM/Cloud-NLP ohne eigene DSGVO-Entscheidung (CLAUDE.md: „by design“). Bei Unsicherheit — heute schon: kein Treffer ≥ Schwelle → Rückfrage-UI („Meintest du …?“, mehrere Bedarfe zur Wahl) bzw. Ratgeber-Einträge, nie Raten.

### 5.3 Spracheingabe im Katalog

```
MicButton (Tap → erst jetzt Permission)
   └─ useSpracheingabe({ matcher: findeHilfe })     // Bedarfe + Krankheitsbilder   on-device, requiresOnDeviceRecognition: true
        └─ Transkript sichtbar + editierbar im KatalogSuchfeld (React-State only)
             └─ Nutzer bestätigt / korrigiert
                  ├─ Bedarf/Krankheitsbild erkannt → „Meintest du: Leichter aufstehen?“ → hilfe/[typ]/[id]   (nur ID geht ans Backend)
                  └─ kein Treffer        → normalisierte Begriffe → suche.tsx (wie getippte Suche)
```

- Keine Auto-Navigation ohne Bestätigung (wie heute bei der Krankheitsbild-Spracheingabe). Da Discovery sessionlos ist, wird auch nichts dispatcht.
- Fehlertexte aus `fehlertextFuer()` wiederverwenden; „…oder wähle aus der Liste unten“ → „…oder tippe deine Suche ein“.
- Transparenzhinweis beim ersten Mikrofon-Tap: „Deine Sprache wird nur auf deinem Gerät verarbeitet.“ (Konzept-Forderung, deckt sich mit der realen Implementierung).
- Ohne Mikrofonberechtigung bleibt alles nutzbar — Mikrofon ist immer sekundär neben dem Textfeld.
- Native-Modul-Hinweis gilt weiter: Dev-Client nötig, `idb` kann kein Mikrofon simulieren.

---

## 6. Phasen

Accessibility-Kriterien (§3.5) und Datenschutz-Anforderungen (§4.4) gelten in **jeder** Phase. Jede Phase endet mit `npm run typecheck`, `npm run lint`, `npm run test` (bei Domain-Änderungen), `npm run backend:typecheck`, `backend:test` + `backend:test:e2e` (bei Modul-/Domain-Änderungen) und einem `idb`-Durchklicken inkl. VoiceOver-Stichprobe.

| Phase | Umfang | Ergebnis / Abnahme |
|---|---|---|
| **0 – Vorarbeiten** | Sentry/OTel-Maskierung von Query-Parametern (Suche, `bedarfId`, `krankheitsbildId`); `einblenden()` Reduce-Motion; juristische Prüfung der dauerhaften Einwilligung anstoßen | Keine Suchbegriffe/IDs in Logs/Traces nachweisbar |
| **1a – Navigation** | Tab „Aufgaben“ → „Entdecken“; Aufgaben als Modal über die Glocke (§3.1); `KatalogStart` zunächst mit heutigem Katalog-Inhalt; CLAUDE.md-Routing aktualisieren | Glocke öffnet Aufgaben-Modal (schließbar per Button + Geste), Entdecken-Tab erreichbar, Swipe zwischen Tabs funktioniert |
| **1b – Katalogbasis** | Schema: Kategorie-Hierarchie/`slug`/`sort_order`, `products.kurzbeschreibung`/`artikelnummer`, `product_images`; Seed: 7 Haupt- + Unterkategorien, Bestandsmigration + Taxonomie-Abgleich (§2.1, Invarianten-Test), Platzhalterprodukte je Unterkategorie; Routen `kategorie/[id]`, `produkt/[id]`; `KategorieKarte`, `KatalogProduktKarte`, `ProduktGalerie`; CTA nur noch auf Detailseite; Krankheitsbild-Lookup mit Kind-Kategorien | Alle 7 Hauptkategorien erreichbar, max. 2 Ebenen; Rezept-/Katalog-/Krankheitsbild-Pfade weiter grün (Backend-e2e) |
| **2 – Suche** | `katalogSuche.ts` (+ Tests), pg_trgm/unaccent, Query-Expansion im Backend, `suche.tsx`, on-device Vorschläge, Null-Treffer-Alternativen, `useKatalogSuche`; `products.attributes` + `katalogFilter.ts` + `ProduktFilter` | Synonyme & Tippfehler finden Produkte; Filter verständlich, zurücksetzbar, bleiben beim Zurück erhalten |
| **3 – Spracheingabe** | `useSpracheingabe` generalisieren (Krankheitsbild-Screen vorerst darauf umstellen, Verhalten unverändert), Mikrofon im `KatalogSuchfeld`, editierbares Transkript, Transparenzhinweis | Aufnahme → Prüfung → Korrektur; App ohne Mikrofonrecht voll nutzbar |
| **4a – Discovery & Einwilligung** | `bedarf.ts` (+ Tests), „Wobei brauchst du Hilfe?“ mit Bedarfen + Krankheitsbildern, `hilfe/[typ]/[id]`, `bedarfId`/`krankheitsbildId`-Filter auf `GET /products`, Rückfrage-UI; `/einstieg` „Krankheitsbild beschreiben“ → Discovery; optionaler `krankheitsbildId`-Kontext an `KATALOG_PRODUKT_*`; dauerhafte Einwilligung (§2.3: `consent_grants`, `EINWILLIGUNG_UEBERNOMMEN`, Widerruf in Einstellungen, Domain-/e2e-Tests inkl. widerrufener/veralteter Grant) | Produkte ohne Produktkenntnis auffindbar; Bedarf & Krankheitsbild in einem Weg; zweiter Prozess fragt nicht erneut nach Einwilligung, Versionswechsel schon |
| **4b – FSM aufräumen** | `KRANKHEITSBILD_*`-Zustände/-Events, `ZURUECK_KRANKHEITSBILD`, `eintrittspfad: 'KRANKHEITSBILD_SELBSTZAHLER'`, `app/scan/krankheitsbild*.tsx` entfernen; Migration laufender Sessions; `STATUS_META`/`SCHRITT_REIHENFOLGE`/Analytics/`patchInner`/Tests anpassen; CLAUDE.md-Abschnitte zu Krankheitsbild & Einwilligung neu schreiben | Rezept- und Katalog-Pfad grün (App- + Backend-Tests, e2e), keine Referenzen auf entfernte Events |
| **5a – Q&A-Bibliothek** | `qa_entries` + `qa_entry_links` im `catalog`-Modul, `GET /qa`, `GET /qa/:slug`, Seed mit Platzhalter-Einträgen; `lib/api/qa.ts`, `QaListe`, `ratgeber/[id]`; Einbindung in Produktdetail, Kategorie-, Hilfe-, Such- und Null-Treffer-Screens; Backend-Tests für Verknüpfungsauflösung (Produkt → Kategorie → Elternkategorie) | Fragen erscheinen am richtigen Produkt ohne Pflege pro Produkt; Quellen + Prüfdatum sichtbar |
| **5b – Komplementärketten** | `product_variants`, `product_relations`, `GET /products/:id/related`, `PassendesZubehoer`, Kompatibilität pro Variante; Dokumente optional | Zubehör eindeutig zugeordnet; inkompatibles Zubehör erscheint nicht |
| **6 – Merkliste** | Lokal, SecureStore, nur Produkt-IDs; Herz auf Detailseite, Abschnitt im Entdecken-Tab (§7) | Merken/Entfernen per VoiceOver bedienbar; nichts verlässt das Gerät |
| **7 – Qualitätssicherung** | Vollständiger VoiceOver/TalkBack-Durchlauf, größte Dynamic-Type-Stufe auf allen Katalog-Screens, Performance (Listen > 100 Produkte → `FlatList` statt `map` in `ScrollContainer`), Nutzertests | MVP-Abnahmekriterien §8 |

Nach Phase 1, 4a und 4b: `CLAUDE.md` (Abschnitt „Katalog-Browsing…“) und `project_overview`-Memory aktualisieren.

---

## 7. Merkliste (Entscheidung F4: nicht im MVP, Phase 6)

Begründung: Das Konzept nennt die Merkliste, aber keines der MVP-Abnahmekriterien braucht sie; die neue Navigation hat keinen Platz für einen eigenen Tab; und sie ist die einzige Katalog-Funktion, die Gesundheitsinferenzen *speichert*. Wird nach Q&A und Zubehör gebaut, mit diesen Leitplanken:

- Kein Login-Zwang (Konzept) und keine Backend-Speicherung ohne Kundenzuordnung (Gäste haben keine `customerId`; `resolveOwnerFilter` würde 403 liefern).
- Lokal in `expo-secure-store`, weil die Liste Gesundheitsinferenzen erlaubt.
- „Zuletzt angesehen“ wird nicht gebaut (gleiches Risiko, geringer Nutzen).
- Einstieg: Herz-Button auf der Produktdetailseite (sekundär), Liste als Abschnitt im Entdecken-Tab — kein eigener Tab.
- Geräteübergreifende Synchronisierung erst, wenn es ein Kundenkonto-Konzept mit Einwilligung dafür gibt.

---

## 8. MVP-Abnahmekriterien (aus dem Konzept, auf SaniMe übertragen)

- [ ] Produkte ohne Registrierung/Session entdeckbar (`starten()` erst bei „Diese Versorgung wählen“).
- [ ] Alle sieben Hauptkategorien erreichbar, max. zwei Ebenen bis zur Liste.
- [ ] Suche versteht gebräuchliche Produktnamen, Synonyme und Tippfehler.
- [ ] Spracheingabe: aufnehmen → Transkript prüfen → korrigieren; Transkript verlässt nie das Gerät.
- [ ] App ohne Mikrofonberechtigung vollständig nutzbar.
- [ ] Filter verständlich (Alltagssprache), jederzeit zurücksetzbar, bleiben beim Zurück erhalten.
- [ ] Detailseite: wesentliche Infos vor technischen Daten; HiMi-Nr. nur im aufklappbaren Technik-Bereich.
- [ ] Genau eine Primär-CTA pro Screen.
- [ ] Kompatibles Zubehör eindeutig zugeordnet (ab Phase 5).
- [ ] Nicht bestellbare Produkte gekennzeichnet, CTA mit Begründung deaktiviert.
- [ ] VoiceOver/TalkBack: vollständige Katalognavigation, sinnvolle Labels/Hints, logische Fokusreihenfolge.
- [ ] Größte Schriftstufe: keine abgeschnittenen Bedienelemente; Touch-Targets ≥ 44 (Ziel 48).
- [ ] Reduce Motion wird respektiert.
- [ ] Null-Treffer bietet Alternativen (Vorschlag, Bedarfe, Kategorien, Ratgeber).
- [ ] Entdecken ist mittlerer Tab; Aufgaben öffnen als Modal über die Glocke.
- [ ] Bedarfe und Krankheitsbilder in einem Discovery-Weg, sessionlos; Session + Einwilligung erst beim Prozessstart.
- [ ] Einwilligung gilt dauerhaft bis zur Versionsänderung, ist widerrufbar und serverseitig nachvollziehbar übernommen.
- [ ] Q&A-Bibliothek an Produkt, Kategorie, Bedarf und Krankheitsbild verknüpft; eigene Texte mit Quellen und Prüfdatum.
- [ ] Keine Suchbegriffe/Produktaufrufe in Logs, Traces oder Analytics.
- [ ] HiMi-vs.-Selbstzahler-Entscheidung weiterhin ausschließlich serverseitig validiert (bestehende 400-Regel).
- [ ] Alle Katalogdaten klar als Platzhalter gekennzeichnet.

---

## 9. Entscheidungen & offene Fragen

### Entschieden (2026-10-19)

- **F1 – Katalog-Einstieg:** Mittlerer Top-Tab „Aufgaben“ wird zu „Entdecken“; Aufgaben öffnen als Modal über die Glocke (§3.1).
- **F2 – Krankheitsbild vs. Bedarf:** Beides wird angeboten, aber als *ein* sessionloser Discovery-Weg; die Einwilligung wird vor dem ersten Prozess eingeholt und gilt dauerhaft bis zur Versionsänderung (§2.2, §2.3). Der separate Krankheitsbild-FSM-Pfad entfällt (Phase 4b).
- **F3 – Beratung:** Keine Nutzer-Fragen; kuratierte Q&A-Bibliothek aus öffentlich verfügbarem Wissen, in eigenen Worten, verknüpft mit Produkten/Kategorien/Bedarfen/Krankheitsbildern (§4.5, Phase 5a).

- **F4 – Merkliste:** Nicht im MVP; Phase 6, nur lokal in SecureStore, Einstieg über Detailseite + Entdecken-Tab (§7).
- **F5 – Bilder:** Schema/API ab Phase 1, bis zu lizenzierten Herstellerbildern einheitliche Kategorie-Icon-Platzhalter, keine Stockfotos (§4.2).
- **F6 – Taxonomie:** Atemhilfen, Wundversorgung, Sehhilfen bekommen Unterkategorien; Hörhilfen fliegen raus (Hörakustiker, nicht Sanitätshaus); Invarianten-Test verhindert leere Empfehlungen (§2.1).
- **F8 – Einwilligung für Gäste:** Gilt für Gäste und Kunden über einen eigenen, nur zur Übernahme berechtigten Einwilligungs-Grant, widerrufbar (§2.3).

### Offen

Keine Produktentscheidungen offen. Extern zu klären (blockiert nur Phase 4a-Freigabe, nicht die Entwicklung): juristische Prüfung der dauerhaften Einwilligung (Art. 9 DSGVO) sowie der Q&A-Inhalte (Heilmittelwerbegesetz) — zusammen mit der bereits laufenden ZAG-/Leistungserbringer-Prüfung.
