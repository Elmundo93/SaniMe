Ich würde diesen Integrationsplan bewusst nicht als klassisches UI-Redesign verstehen. SaniMe befindet sich bereits an einem Punkt, an dem die Funktionalität weitgehend definiert ist. Jetzt geht es darum, eine konsistente Produktsprache über die gesamte Anwendung zu legen. Ziel ist nicht, einzelne Screens zu modernisieren, sondern eine visuelle Identität zu schaffen, die Vertrauen vermittelt, Wiedererkennbarkeit erzeugt und langfristig skalierbar bleibt.

⸻

SaniMe Design Integration Roadmap (v1.0)

Zielbild

Die App soll wirken, als wäre sie speziell für moderne Apple-Plattformen entwickelt worden, ohne eine Kopie zu sein.

Leitbegriffe:

* Calm
* Premium
* Trustworthy
* Fluid
* Accessible
* Lightweight

Der Nutzer soll während der gesamten Nutzung nie das Gefühl haben, mit Bürokratie zu interagieren. Er interagiert ausschließlich mit SaniMe.

⸻

Phase 1 – Design Foundation

> **Status (2026-07-03):** ✅ Fertig und im gesamten Code migriert. `packages/@sanime/design-system` existiert exakt wie im "Langfristiges Ziel" unten beschrieben (als eigenständiges Paket im Monorepo), mit `colors.ts`, `spacing.ts`, `radius.ts`, `blur.ts`, `glass.ts`, `opacity.ts`, `shadows.ts`, `typography.ts`, `durations.ts`, `springs.ts`, `haptics.ts`, `elevation.ts` — `animations.ts` fehlt als eigene Datei (Springs/Durations decken das ab). Die alten `constants/design.ts`/`constants/colors.ts` sind gelöscht; `index.ts` exportiert `D` als 1:1-Ersatz. 44 von 52 relevanten `.tsx`/`.ts`-Dateien unter `app/`/`components/` importieren aus `@sanime/design-system`; die restlichen 8 sind reine Layout-/Nav-Dateien ohne Farbbedarf.

Ziel: Die vollständige visuelle Sprache definieren.

Noch keine Screens.

Noch kein Refactoring.

Es entsteht ausschließlich das Design-System.

1.1 Design Tokens

Ein zentraler Token-Layer.

colors.ts
spacing.ts
radius.ts
blur.ts
glass.ts
opacity.ts
shadows.ts
typography.ts
animations.ts
haptics.ts
durations.ts
elevation.ts

Alles Weitere baut ausschließlich auf diesen Tokens auf.

⸻

1.2 Farbpalette

Nicht viele Farben.

Nur perfekt abgestimmte.

Primary

Glacier Blue

Ice Blue

Sky Blue

Accent Blue

⸻

Neutral

Background

Surface

Surface Elevated

Border

Separator

⸻

Semantic

Success

Warning

Info

Critical

⸻

Gradients

Hero Gradient

Card Gradient

Splash Gradient

Glass Reflection Gradient

⸻

1.3 Typografie

Nur wenige Größen.

Apple-inspiriert.

Large Hero
Large Title
Title
Headline
Body
Caption
Footnote

Feste Line Heights.

Keine manuellen Anpassungen.

⸻

1.4 Spacing

8pt Grid.

4
8
12
16
24
32
40
48
64

Kein willkürlicher Abstand mehr.

⸻

1.5 Radius

Button
16
Card
28
Modal
36
Camera Button
40
Avatar
50%

⸻

1.6 Shadow Language

Apple verwendet extrem subtile Schatten.

Nur drei Ebenen.

Low
Medium
Floating

⸻

1.7 Glass Material

Eine komplette Definition.

Beispielsweise

Glass Light

Glass Elevated

Glass Navigation

Glass Modal

Glass Hero

Jede Ebene besitzt

* Blur
* Tint
* Opacity
* Border
* Shadow
* Reflection

⸻

Phase 2 – Motion Language

> **Status (korrigiert 2026-07-03):** ✅ Als Token-Layer fertig — `packages/@sanime/design-system/durations.ts` (`ultraFast/fast/normal/slow`), `springs.ts` (`primary/navigation/button/hero`), `haptics.ts` (`light/medium/heavy/success/warning` + `selectionHaptic`, leicht andere Benennung als "Selection" aber funktional vorhanden). Bewusst NICHT als eigene "Shared Animations"-Bibliothek mit benannten Bausteinen (Card Lift, Glow, Hero Transition, Liquid Reveal) gebaut — Animationen werden pro Screen direkt mit `react-native-reanimated` unter Verwendung dieser Tokens komponiert, statt in einer separaten Katalog-Ebene. *(Vorherige Einschätzung in diesem Dokument — "kein Artefakt gefunden" — war falsch; siehe project-designplan-status Memory für den vollen Kontext.)*

Jetzt entsteht die “Lebendigkeit”.

⸻

Animation Tokens

Ultra Fast
Fast
Normal
Slow

⸻

Springs

Primary Spring

Navigation Spring

Button Spring

Hero Spring

⸻

Shared Animations

Card Lift

Fade

Blur

Glow

Hero Transition

Progress Animation

Timeline Animation

Floating Button

Parallax

Liquid Reveal

⸻

Haptics

Light

Medium

Heavy

Success

Warning

Selection

Jede Aktion bekommt genau eine Haptic Definition.

⸻

Phase 3 – Komponentenbibliothek

> **Status (korrigiert 2026-07-03):** ✅ Bewusst verkleinert umgesetzt, nicht vollständig fehlend. `GlassCard` hat einen `tier`-Prop (`components/ui/GlassCard.tsx`), der die 5 Stufen aus `glass.ts` (`light/elevated/navigation/modal/hero`) auflöst, inkl. gerenderter Reflection (siehe Phase 7). `Avatar` (Dashboard-Header + Einstellungen-Profil-Hero), `LoadingState` (OCR-Ladebildschirme in `rezept.tsx`/`krankenkasse.tsx`), `IconButton` (Kamera-Icon-Buttons), `Section` (konsolidiert `zusammenfassung.tsx` + `einstellungen/index.tsx`) sind gebaut und an echten Call-Sites verdrahtet. Die übrigen ~20+ Komponenten (`GlassBottomSheet`, `SegmentedControl`, `Toast`, `ConfirmationSheet`, `DatePicker`, `InsuranceCard` etc.) wurden bewusst NICHT gebaut, da kein Screen sie aktuell braucht — das ist eine dokumentierte Scope-Entscheidung gegen spekulativen Code (siehe CLAUDE.md: keine Abstraktionen über den Bedarf hinaus), keine offene Lücke. `Foundation Components` (`Screen`/`ScrollContainer`/`SafeArea`/`Spacer`) wurden hier gebaut, aber erst in Phase 10 flächendeckend verdrahtet. Kein systematischer Nachweis für Light/Dark/Loading/Disabled/Pressed/Focused/Error/Success auf jeder einzelnen Komponente — Dark Mode ist app-weit strukturell out of scope (keine `useColorScheme`-Infrastruktur).

Jetzt entsteht keine einzige Seite.

Nur Bausteine.

⸻

Foundation Components

Screen
ScrollContainer
Section
SafeArea
Spacer

⸻

Surface Components

GlassCard
GlassHero
GlassPanel
GlassBottomSheet
GlassNavigationBar

⸻

Interactive

PrimaryButton
SecondaryButton
IconButton
CameraButton
SegmentedControl
FloatingButton

⸻

Status

ProgressRing
Timeline
Badge
StatusIndicator
ProcessStepper
LoadingState

⸻

Form

GlassInput
Search
Dropdown
DatePicker
SelectionCard
Checkbox
Switch

⸻

Feedback

Toast
Snackbar
ConfirmationSheet
Modal
ErrorCard
SuccessCard

⸻

Profile

Avatar
ProfileHeader
InsuranceCard
AddressCard
MedicalCard

⸻

Alle Komponenten erhalten:

Light

Dark

Loading

Disabled

Pressed

Focused

Error

Success

⸻

Phase 4 – Icon System

> **Status (korrigiert 2026-07-03):** ✅ Fertig. Vollständige Migration auf `@expo/vector-icons`s `Feather`-Set (Outline, konstante Strichstärke) — `Feather` wird in 20 Dateien importiert. Ein Emoji-Grep über `app/` und `components/` findet genau einen verbleibenden Treffer: das bewusste `✦`-Markenzeichen in `app/onboarding/index.tsx` (kein System-Icon, sondern eine eigene animierte Markenmarke). Kein separates dokumentiertes "Icon-System"-Artefakt im Design-Package, aber die Konsistenz in der Praxis ist vollständig durchgesetzt.

Einheitliche Symbolsprache.

Nur Outline.

Konstante Strichstärke.

Alle Icons stammen aus derselben Familie.

⸻

Phase 5 – Screen Audit

> **Status:** ⚠️ Bewusst nicht als eigenes Dokument geschrieben, aber in die Phasen 6–10 eingeflossen — die dort gefundenen und behobenen Screen-für-Screen-Lücken (z. B. der fehlende `StatusBar`-Kontrast auf den dunklen Hero-Screens, Phase 10) sind das praktische Ergebnis eines Audits, nur nicht als separate Spezifikationsdatei festgehalten. Falls eine schriftliche Screen-Spezifikation je gebraucht wird, müsste sie nachträglich aus den bereits getroffenen Entscheidungen rekonstruiert werden.

Erst jetzt wird jeder Screen analysiert.

Für jeden Screen entsteht eine Spezifikation.

⸻

Welcome

Emotion

Vertrauen

Ziel

Ruhe

CTA

Loslegen

⸻

Onboarding

Emotion

Einfachheit

Animation

Sehr hochwertig

⸻

Dashboard

Emotion

Alles läuft.

Der Nutzer muss nichts tun.

⸻

Versorgung

Emotion

Übersicht

Keine Tabellen.

⸻

Scan

Emotion

Sicherheit

Fokus.

⸻

Status

Emotion

Kontrolle

⸻

Settings

Emotion

Verlässlichkeit

⸻

Jeder Screen erhält anschließend:

* Informationshierarchie
* Interaktionshierarchie
* Animationskonzept
* Haptik
* Übergänge
* States
* Accessibility

⸻

Phase 6 – Navigation

> **Status (korrigiert 2026-07-03):** ✅ Fertig. Neben der 3-Tab-Struktur (`app/(app)/_layout.tsx`s `PremiumTabBar`) wurden drei wiederverwendbare Header-Komponenten extrahiert und flächendeckend verdrahtet: `components/ui/ScreenHeader.tsx` in genau 9 Screens (`dashboard/[id]`, `datenpruefung`, `termin`, `zusammenfassung`, `versorgungen`, `agb`, `checkout`, `review`, `datenschutz-text`), `components/ui/CameraOverlayHeader.tsx` in `rezept.tsx`/`krankenkasse.tsx`, `components/ui/BackLink.tsx` in 3 Screens (`dashboard/[id]`, `checkout`, `leistungsuebersicht`). Dabei wurden auch reale Bugs behoben (`CameraButton`-Größenmismatch, `_layout.tsx`s freischwebender `marginLeft`-Magic-Value, `BlurView`-Intensity ohne Tokenbezug). Kein separat benanntes "immer dieselben Animationen"-System über alle Wechsel hinweg, aber die Header-Konsolidierung selbst erzwingt bereits Konsistenz.

Die Navigation erhält ebenfalls eine eigene Sprache.

Große Header.

Floating Navigation.

Glass.

Sanfte Übergänge.

Immer dieselben Animationen.

⸻

Phase 7 – Lichtsystem

> **Status (korrigiert 2026-07-03):** ✅ Die zwei am stärksten evidenzbasierten Bausteine sind fertig: `components/ui/HeroGlow.tsx` konsolidiert den radialen Glow-Hintergrund aus genau 3 Screens (`dashboard/index`, `einstellungen/index`, `dashboard/[id]`) — dabei wurde ein echter Farbfehler behoben (ein hartkodiertes Alt-Blau, das die Phase-1-Migration übersehen hatte). `GlassCard` rendert `glass.ts`s `reflection`-Wert als diagonalen Highlight-Streifen (iOS), sichtbar sobald ein `tier`-Prop gesetzt ist. "Ambient Lighting", "Highlight Layer", "Depth Layer" und scrollreaktive Lichteffekte wurden bewusst NICHT gebaut — kein aktueller Screen braucht sie, und sie hätten `useAnimatedScrollHandler` in jeden scrollbaren Screen bringen müssen (Jank-Risiko ohne belegten Nutzen).

Apple lebt von Licht.

Nicht von Farbe.

Deshalb definieren wir:

Hero Glow

Glass Reflection

Ambient Lighting

Highlight Layer

Depth Layer

Diese verändern sich subtil beim Scrollen.

⸻

Phase 8 – Scan Experience

> **Status (korrigiert 2026-07-03):** ✅ Die zwei real fehlenden Lücken sind geschlossen: "Haptic Finish" (`Haptics.notificationAsync(Success)` bei erfolgreicher Aufnahme, in `rezept.tsx`/`krankenkasse.tsx`) und "Live Glow" (`hooks/useGlowPulse.ts` lässt die Rahmenecken pulsieren, in beiden Kamera-Screens genutzt). Animated Frame und Corner Highlights waren schon vorher vorhanden. Bewusst NICHT gebaut: Depth Blur (keine einfache RN-Primitive für Live-Kamera-Blur ohne neue native Dependency), Automatic Success Animation und Confirmation Overlay (hätten einen neuen Zwischenzustand in die von `useOnboardingGuard` gegatete State Machine eingeführt — CLAUDE.md dokumentiert, dass genau auf diesen beiden Kamera-Screens bereits zweimal ein Übergangs-Bug geshippt ist, daher bewusst nicht ohne konkreten Produktbedarf riskiert).

Der Scan ist das Herzstück.

Er bekommt eine eigene Designsprache.

Animated Frame

Depth Blur

Corner Highlights

Live Glow

Automatic Success Animation

Haptic Finish

Confirmation Overlay

Der gesamte Scan soll sich wie ein nativer Systemdialog anfühlen.

⸻

Phase 9 – Prozessvisualisierung

> **Status (korrigiert 2026-07-03):** ✅ `components/dashboard/StatusTimeline.tsx` zeigt den Versorgungsstatus als Zeitachse statt Fortschrittsbalken und hat jetzt (analog zu `components/ui/ProcessStep.tsx`) einen pulsierenden aktiven Punkt (`PulsRing`, `withRepeat(withSpring(...))`), zuvor fehlte diese Animation dort während `ProcessStep` direkt daneben auf demselben Screen bereits pulsierte — eine sichtbare Inkonsistenz, die behoben wurde. `ProcessStep` und `StatusTimeline` sind zwei bewusst unterschiedliche, komplementäre Ansichten (Kurzüberblick vs. Verlaufsprotokoll), keine Dopplung, die verschmolzen werden müsste.

Das Dashboard erhält eine eigene Identität.

Keine klassischen Fortschrittsbalken.

Stattdessen:

* animierter Prozesspfad
* organische Übergänge
* weiche Statuswechsel
* fließende Zeitachse

Der Nutzer sieht jederzeit:

* Wo steht meine Versorgung?
* Was passiert gerade?
* Muss ich etwas tun?

⸻

Phase 10 – Produktionsintegration

> **Status (korrigiert 2026-07-03):** ✅ Sprint A (Design Tokens, siehe Phase 1) fertig. Zusätzlich wurden die zuvor gebauten, aber ungenutzten Foundation-Komponenten `Screen`/`ScrollContainer` in genau 13 bzw. 12 Screens verdrahtet (alle Onboarding-/Scan-/Dashboard-/Einstellungen-Screens außer den beiden Kamera-Screens, die als Vollbild-Kameraansichten kein Screen-Shell brauchen). Dabei wurde `Screen` additiv um einen `background`-Slot (für Hero-Glow-Hintergründe, die unter die Notch bluten müssen) und einen konfigurierbaren `edges`-Prop erweitert, und ein echter Accessibility-Bug behoben (zwei dunkle Hero-Screens hatten gar keinen `StatusBar`-Kontrast gesetzt). Die Sprints B–J sind nicht als separat benannte, abgeschlossene Arbeitspakete dokumentiert, aber ihre Substanz ist über die Phasen 3/6/7/8/9 oben tatsächlich umgesetzt.

Erst jetzt beginnt die eigentliche Implementierung.

Sprint A

Design Tokens

Sprint B

Komponentenbibliothek

Sprint C

Navigation

Sprint D

Dashboard

Sprint E

Onboarding

Sprint F

Scan

Sprint G

Versorgung

Sprint H

Settings

Sprint I

Motion

Sprint J

Polishing

⸻

Qualitätssicherung

Jede Komponente wird gegen einen festen Qualitätskatalog geprüft:

* Nutzt ausschließlich Design Tokens.
* Unterstützt Light- und Dark-Mode.
* Besitzt definierte Zustände (Loading, Error, Disabled, Success).
* Erfüllt Mindestgrößen für Touch-Ziele.
* Funktioniert mit Dynamic Type.
* Unterstützt VoiceOver/TalkBack.
* Erreicht 60 FPS als Minimum, Zielwert 120 FPS.
* Verwendet keine hart kodierten Farben, Abstände oder Radien.

⸻

Langfristiges Ziel

Das Design-System sollte nicht nur SaniMe abdecken, sondern als Basis für zukünftige Produkte dienen. Ich würde daher den Namen SaniMe Design System (SDS) wählen und es als eigenständiges Paket innerhalb des Monorepos führen.

packages/
└── @sanime/design-system
    ├── tokens/
    ├── themes/
    ├── components/
    ├── animations/
    ├── icons/
    ├── haptics/
    ├── hooks/
    ├── utils/
    └── docs/

Damit wird die UI vollständig tokenbasiert und komponentenorientiert. Neue Screens werden künftig nicht mehr individuell gestaltet, sondern aus einem konsistenten Baukasten zusammengesetzt. Das reduziert den Wartungsaufwand erheblich, verbessert die Konsistenz und ermöglicht es, das angestrebte hochwertige Erscheinungsbild dauerhaft über die gesamte Anwendung hinweg zu bewahren.