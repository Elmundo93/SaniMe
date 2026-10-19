
SaniMe – Katalogarchitektur & UX-Konzept

Ziel: Ein barrierearmer, intuitiver Produktkatalog, der Menschen unabhängig von Alter, technischen Fähigkeiten und medizinischem Fachwissen ermöglicht, geeignete Hilfsmittel zu entdecken und anzufragen oder zu bestellen.

Der Katalog soll sowohl als klassischer Shop als auch als digitaler Versorgungsassistent funktionieren.

1. Informationsarchitektur

Hauptnavigation

Die bestehende SaniMe-App wird um einen Katalogbereich erweitert. Ich empfehle vier zentrale Navigationspunkte:

Navigation	Funktion
Entdecken	Produktkatalog, Suche, bedürfnisorientierte Beratung
Meine Versorgung	Rezepte, Bestellungen, Versorgungsstatus
Merkliste	Gespeicherte Produkte und Versorgungslösungen
Profil	Einstellungen, persönliche Angaben, Barrierefreiheit

Die bereits geplante zentrale Kamerafunktion für den Rezeptscan sollte weiterhin direkt erreichbar bleiben.

Katalog-Startseite

Die Startseite sollte drei gleichwertige Zugangswege bieten:

A. Produktsuche

Für Nutzer, die bereits wissen, welches Produkt sie benötigen.

* Prominentes Suchfeld
* Texteingabe
* Spracheingabe
* Suchvorschläge
* Fehlertolerante Suche

B. „Wobei benötigen Sie Hilfe?“

Für Nutzer, die ihren Bedarf kennen, aber nicht das passende Hilfsmittel.

Beispiele:

* „Ich kann nicht mehr so gut laufen.“
* „Meine Mutter benötigt Unterstützung beim Duschen.“
* „Ich suche etwas, das mir beim Aufstehen hilft.“

C. Kategorien entdecken

Für Nutzer, die das Sortiment durchstöbern möchten.

Produktkategorien

Kategorie	Unterkategorien
Mobil bleiben	Rollatoren, Rollstühle, Gehhilfen, Rampen
Zuhause leichter leben	Greifhilfen, Anziehhilfen, Esshilfen, Aufstehhilfen
Bad & Toilette	Duschhilfen, Badewannenhilfen, Toilettenhilfen
Pflege & Schlafen	Pflegebetten, Matratzen, Lagerung, Transferhilfen
Gesundheit & Wohlbefinden	Bandagen, Kompression, Messgeräte
Hygiene & Inkontinenz	Inkontinenzartikel, Hautpflege, Hygiene
Bewegung & Training	Bewegungstrainer, Therapiegeräte, Trainingszubehör

Maximal zwei Kategorieebenen bis zur Produktliste. Weitere Differenzierungen erfolgen über Filter.

⸻

2. UX-Prinzipien

2.1 Progressive Disclosure

Nur Informationen anzeigen, die für den aktuellen Schritt relevant sind.

Beispiel Produktsuche:

1. Nutzer beschreibt seinen Bedarf.
2. App zeigt passende Produktgruppen.
3. Nutzer wählt eine Produktgruppe.
4. App zeigt geeignete Produkte.
5. Nutzer erhält Details, Zubehör und Bestellmöglichkeiten.

Technische Informationen wie Hilfsmittelnummern, Materialzusammensetzung oder detaillierte Abmessungen werden erst auf der Produktdetailseite angezeigt.

2.2 Accessibility by Default

Barrierefreiheit wird nicht als optionaler Modus implementiert.

Element	Vorgabe
Schriftgröße	Dynamisch skalierbar
Fließtext	Ausgangswert ca. 17–18 pt
Touchflächen	Mindestens 48 × 48 dp/pt als Designziel
Kontrast	Mindestens 4,5:1 für normalen Text
Navigation	Screenreader-kompatibel
Icons	Immer mit Text kombinieren
Animationen	Reduzierbar
Fehlermeldungen	Verständlich und mit konkreter Lösung
Eingaben	Sprache, Tastatur und Touch

Die Umsetzung sollte sich an WCAG 2.2 AA orientieren. Besonders wichtig sind Fokusführung, Textvergrößerung, verständliche Beschriftungen und ausreichende Zielgrößen.

2.3 Keine unnötigen Interaktionen

* Keine Registrierung zum Durchstöbern des Katalogs.
* Keine verpflichtenden Fragebögen.
* Keine unnötigen Bestätigungsdialoge.
* Filter bleiben beim Zurücknavigieren erhalten.
* Produktsuche funktioniert ohne Standortfreigabe.
* Bestellungen und Anfragen besitzen einen klaren Abschluss.

Grundprinzip: Jeder Nutzer soll jederzeit erkennen, wo er sich befindet und welche Handlung als Nächstes möglich ist.

⸻

3. Spracheingabe und intelligente Suche

Die Spracheingabe würde ich als integralen Bestandteil der Suche implementieren.

Sie sollte nicht als separater KI-Chat beginnen.

3.1 Interaktionsablauf

Nutzer öffnet Katalog
        │
        ▼
Suchfeld mit Mikrofon
        │
        ▼
Nutzer spricht:
"Ich brauche etwas,
damit meine Mutter
leichter aufstehen kann."
        │
        ▼
Speech-to-Text
        │
        ▼
Bedarfserkennung
        │
        ▼
Passende Kategorien:
- Aufstehhilfen
- Sitzhilfen
- Bettaufrichter
        │
        ▼
Produktergebnisse

Die Transkription wird vor der Suche sichtbar gemacht und kann korrigiert werden.

Wichtig: Spracheingabe ≠ KI-Pflicht

Für den MVP würde ich zwei Verarbeitungsebenen vorsehen.

Ebene 1: Deterministische Suche

* Volltextsuche
* Synonyme
* Kategoriezuordnung
* Fehlertoleranz
* Schlagwörter

Beispiel:

const synonyms = {
  rollator: [
    "gehwagen",
    "laufhilfe",
    "gehhilfe",
    "wagen zum laufen"
  ],
  duschstuhl: [
    "duschsitz",
    "sitz zum duschen",
    "duschhocker"
  ]
};

Ebene 2: Semantische Bedarfserkennung

Bei komplexeren Beschreibungen wird die Suchanfrage interpretiert.

Beispiel:

„Mein Vater kann nach seiner Operation nicht lange stehen.“

Mögliche Zuordnung:

* Mobilitätsunterstützung
* Sitzmöglichkeiten
* Alltagshilfen

Das System darf dabei keine Diagnose stellen oder medizinische Eignung behaupten.

Bei Unsicherheit wird eine Rückfrage gestellt oder eine Beratung angeboten.

3.2 Technische Umsetzung

Für den bestehenden Expo-/React-Native-Stack:

SearchInput
    │
    ├── TextInput
    │
    └── VoiceInput
           │
           ▼
    Speech Recognition
           │
           ▼
    SearchService
           │
           ├── Fulltext Search
           ├── Synonym Matching
           └── Semantic Search (optional)
                    │
                    ▼
              SearchResults

Speech-to-Text sollte über eine austauschbare Schnittstelle integriert werden.

Wichtig bei der Bibliothekswahl: Native Spracherkennung benötigt gegebenenfalls einen Expo Development Build und funktioniert nicht zwangsläufig in Expo Go.

Die App sollte Mikrofonberechtigungen erst beim Start einer Sprachaufnahme anfordern und transparent machen, ob die Verarbeitung lokal oder über einen externen Dienst erfolgt.

⸻

4. Produktlisten und Filter

Produktkarte

Jede Produktkarte enthält:

1. Produktbild
2. Verständlichen Produktnamen
3. Kurze Beschreibung des Nutzens
4. Preis beziehungsweise Hinweis zur Kostenübernahme
5. Verfügbarkeit
6. Eindeutige Aktion

Beispiel:

┌─────────────────────────────┐
│                             │
│       [Produktbild]         │
│                             │
│ Leichtgewichtrollator       │
│                             │
│ Leicht zu transportieren    │
│ und zusammenzuklappen.      │
│                             │
│ Ab 129,00 €                 │
│                             │
│ [Produkt ansehen]           │
└─────────────────────────────┘

Preise sind hier ausschließlich illustrative Platzhalter.

Filter

Filter werden kontextabhängig angezeigt.

Rollatoren

* Einsatzort: Innen / Außen
* Gewicht
* Belastbarkeit
* Faltbarkeit
* Preis

Rollstühle

* Antriebsart
* Sitzbreite
* Belastbarkeit
* Transportfähigkeit
* Preis

Pflegebetten

* Liegefläche
* Höhenverstellung
* Belastbarkeit
* Funktionen

Filter sollten niemals ausschließlich technische Begriffe verwenden.

Beispiel:

Statt „Eigengewicht“ kann die App „Gewicht des Rollators“ anzeigen.

⸻

5. Produktdetailseite

Die Produktdetailseite folgt einer festen Informationshierarchie.

Abschnitt 1: Produktübersicht

* Bilder
* Name
* Wichtigste Eigenschaften
* Preis und Verfügbarkeit
* Primäre Aktion

Abschnitt 2: „Ist dieses Produkt passend?“

Verständliche Informationen über:

* Vorgesehenen Einsatzbereich
* Abmessungen
* Belastbarkeit
* Voraussetzungen für die Nutzung

Optional eine kurze geführte Auswahl.

Abschnitt 3: Passendes Zubehör

Hier werden die zuvor besprochenen Komplementärketten integriert.

Rollator
   │
   ├── Passendes Zubehör
   │   ├── Tasche
   │   ├── Stockhalter
   │   └── Rückengurt
   │
   ├── Ersatzteile
   │   ├── Räder
   │   └── Bremsen
   │
   └── Dienstleistungen
       ├── Anpassung
       ├── Lieferung
       └── Wartung

Zubehör muss anhand von Modell und Variante auf Kompatibilität geprüft werden.

Abschnitt 4: Technische Informationen

Aufklappbarer Bereich mit:

* Hersteller
* Artikelnummer
* Hilfsmittelnummer, falls vorhanden
* Technischen Daten
* Dokumenten und Gebrauchsanweisungen

Abschnitt 5: Beratung

Gut sichtbare Aktion:

„Frage zu diesem Produkt stellen“

Der Produktkontext wird automatisch an die Anfrage übergeben.

⸻

6. Katalog-Datenarchitektur

Ich empfehle eine Trennung zwischen Produktdaten, Navigation und Versorgungslogik.

Catalog
│
├── Categories
│   ├── id
│   ├── parentId
│   ├── title
│   ├── description
│   └── sortOrder
│
├── Products
│   ├── id
│   ├── name
│   ├── description
│   ├── manufacturerId
│   ├── attributes
│   └── status
│
├── ProductVariants
│   ├── id
│   ├── productId
│   ├── sku
│   ├── attributes
│   └── availability
│
├── ProductRelations
│   ├── sourceProductId
│   ├── targetProductId
│   ├── relationType
│   └── conditions
│
├── Scenarios
│   ├── id
│   ├── title
│   ├── keywords
│   └── categoryIds
│
└── Search
    ├── Synonyms
    ├── Keywords
    └── SearchIndex

Wichtige Ergänzung: Preise, Lieferantenangebote, Hilfsmittelnummern und Abrechnungsberechtigungen gehören in eigene Datenstrukturen. Sie sollten nicht direkt mit dem allgemeinen Produktdatensatz vermischt werden.

So bleibt der Katalog unabhängig vom späteren Vertriebsmodell.

⸻

7. Empfohlene Komponentenstruktur

Für die Expo-App:

features/
└── catalog/
    ├── screens/
    │   ├── CatalogHomeScreen
    │   ├── CategoryScreen
    │   ├── ProductListScreen
    │   ├── ProductDetailScreen
    │   └── SearchScreen
    │
    ├── components/
    │   ├── CatalogSearchBar
    │   ├── VoiceSearchButton
    │   ├── CategoryCard
    │   ├── ProductCard
    │   ├── ProductFilters
    │   ├── ProductGallery
    │   └── RelatedProducts
    │
    ├── hooks/
    │   ├── useCatalog
    │   ├── useProductSearch
    │   └── useVoiceSearch
    │
    ├── services/
    │   ├── catalogService
    │   ├── searchService
    │   └── speechService
    │
    └── types/
        └── catalog.types.ts

Die Screens werden über Expo Router eingebunden. Die Fachlogik bleibt unabhängig von der Navigation.

⸻

8. Entwicklungsreihenfolge

Sprint	Umfang	Ergebnis
1 – Katalogbasis	Kategorien, Produktkarten, Produktdetails, Navigation	Nutzbarer Katalog
2 – Suche	Volltext, Synonyme, Filter, Fehlertoleranz	Produkte schnell auffindbar
3 – Spracheingabe	Speech-to-Text, Berechtigungen, Korrektur der Transkription	Sprachgesteuerte Suche
4 – Bedarfsorientierung	Versorgungsszenarien, geführte Suche	Suche ohne Produktkenntnisse
5 – Komplementärketten	Zubehör, Kompatibilität, Dienstleistungen	Zusammenhängende Versorgung
6 – Qualitätssicherung	Accessibility-Audits, Nutzertests, Performance	Produktionsreifer Katalog

Die Accessibility-Anforderungen gelten bereits ab Sprint 1 und werden nicht erst in Sprint 6 implementiert.

9. Akzeptanzkriterien für den MVP

Der erste Katalog ist aus meiner Sicht fertig, wenn folgende Anforderungen erfüllt sind:

* Nutzer können ohne Registrierung Produkte entdecken.
* Alle sieben Hauptkategorien sind erreichbar.
* Die Suche versteht gebräuchliche Produktnamen und Synonyme.
* Spracheingaben können aufgenommen, überprüft und korrigiert werden.
* Die App bleibt ohne Mikrofonberechtigung vollständig nutzbar.
* Filter sind verständlich und jederzeit zurücksetzbar.
* Produktdetails zeigen die wesentlichen Informationen vor technischen Spezifikationen.
* Kompatibles Zubehör kann eindeutig zugeordnet werden.
* Nicht bestellbare Produkte werden entsprechend gekennzeichnet.
* VoiceOver und TalkBack ermöglichen die vollständige Katalognavigation.
* Große Schriftgrößen verursachen keine abgeschnittenen Bedienelemente.
* Suchanfragen ohne Treffer bieten verständliche Alternativen.

⸻

10. Architekturentscheidung: Katalog und Versorgungsassistent trennen

Ich würde die beiden Funktionen technisch getrennt halten, aber über dieselbe Benutzeroberfläche zugänglich machen.

Catalog Engine: Verwaltet Produkte, Kategorien, Varianten, Verfügbarkeit und Komplementärketten.

Discovery Engine: Interpretiert Texteingaben, Spracheingaben und Versorgungsszenarien und liefert passende Produktgruppen.

Beide verwenden dieselbe Such- und Produktdatenbasis.

Damit kann SaniMe zunächst einen vollständig deterministischen Katalog veröffentlichen und später eine KI-gestützte Versorgungsberatung ergänzen, ohne die grundlegende Architektur verändern zu müssen.

Meine wichtigste UX-Empfehlung: Das Suchfeld mit Mikrofon ist der zentrale Einstieg. Direkt darunter stehen „Wobei benötigen Sie Hilfe?“ und die sieben Produktkategorien. So erreichen sowohl erfahrene Nutzer als auch Menschen ohne medizinisches Fachwissen mit möglichst wenigen Schritten ihr Ziel.