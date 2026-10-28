import React from 'react';
import { KatalogStart } from '../../../components/katalog/KatalogStart';
import { StartTabScroll } from '../../../components/dashboard/StartTabInhalt';

/** Tab „Katalog“ (Route bleibt `entdecken`, `/katalog` ist der Push-Stack):
 * Katalog-Start — sessionlos stöbern, suchen, beschreiben, für Kunden mit
 * Versorgungen zuerst der personalisierte Katalog. Die
 * Drilldown-Screens (`/katalog/*`) werden über die Start-Ansicht gepusht. Der Tab
 * bleibt gemountet (`lazy: false`), eine begonnene Suche überlebt den Tabwechsel. */
export default function EntdeckenTab() {
  return (
    <StartTabScroll>
      <KatalogStart />
    </StartTabScroll>
  );
}
