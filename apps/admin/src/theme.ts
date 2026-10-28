import { ink, neutral, primary, semantic } from '@sanime/design-system/colors';
import { radius } from '@sanime/design-system/radius';

// Farben und Radien kommen aus @sanime/design-system (dieselben Werte wie in
// der Kunden-App) und werden als CSS-Variablen gesetzt — styles.css nutzt
// nur var(--…). Wo ein Token als Textfarbe den WCAG-Kontrast (4,5:1) nicht
// schafft (critical, warning, success sind Flächen-/Symbolfarben), steht hier
// eine dunklere Textvariante.
const hell = {
  '--hintergrund': neutral.background,
  '--flaeche': neutral.surface,
  '--rahmen': neutral.border,
  '--trenner': neutral.separator,
  '--text': ink.ink,
  '--text-2': ink.inkSecondary,
  '--text-3': ink.inkTertiary,
  '--text-invertiert': ink.inkInverted,
  '--akzent': primary.accent,
  '--akzent-text': '#2557B8',
  '--akzent-flaeche': primary.glacier,
  '--fokus': primary.accent,
  '--kritisch': semantic.critical,
  '--kritisch-text': '#A3191F',
  '--kritisch-flaeche': '#FDECEC',
  '--warnung': semantic.warning,
  '--warnung-text': '#7A4B00',
  '--warnung-flaeche': '#FEF4E2',
  '--erfolg': semantic.success,
  '--erfolg-text': '#1B6B43',
  '--erfolg-flaeche': '#E7F6EE',
  '--info-flaeche': primary.glacier,
};

const dunkel: Record<keyof typeof hell, string> = {
  '--hintergrund': '#070B18',
  '--flaeche': '#111A2E',
  '--rahmen': '#2A3754',
  '--trenner': '#1C2740',
  '--text': '#F3F6FB',
  '--text-2': '#C7D2E4',
  '--text-3': '#A6B4CC',
  '--text-invertiert': '#FFFFFF',
  '--akzent': primary.accent,
  '--akzent-text': primary.sky,
  '--akzent-flaeche': '#16284A',
  '--fokus': primary.sky,
  '--kritisch': '#FF8A8E',
  '--kritisch-text': '#FFB3B5',
  '--kritisch-flaeche': '#3A1418',
  '--warnung': '#F5B94D',
  '--warnung-text': '#FFD58F',
  '--warnung-flaeche': '#3A2A0E',
  '--erfolg': '#5BD394',
  '--erfolg-text': '#9BE8C0',
  '--erfolg-flaeche': '#0F3322',
  '--info-flaeche': '#16284A',
};

function block(werte: Record<string, string>) {
  return Object.entries(werte)
    .map(([name, wert]) => `${name}: ${wert};`)
    .join(' ');
}

export function themaAnwenden() {
  const style = document.createElement('style');
  style.dataset.thema = 'sanime';
  style.textContent = [
    `:root { ${block(hell)} --radius-knopf: ${radius.button / 16}rem; --radius-karte: ${Math.min(radius.card, 16) / 16}rem; color-scheme: light; }`,
    `@media (prefers-color-scheme: dark) { :root { ${block(dunkel)} color-scheme: dark; } }`,
  ].join('\n');
  document.head.prepend(style);
}
