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

Einheitliche Symbolsprache.

Nur Outline.

Konstante Strichstärke.

Alle Icons stammen aus derselben Familie.

⸻

Phase 5 – Screen Audit

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

Die Navigation erhält ebenfalls eine eigene Sprache.

Große Header.

Floating Navigation.

Glass.

Sanfte Übergänge.

Immer dieselben Animationen.

⸻

Phase 7 – Lichtsystem

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