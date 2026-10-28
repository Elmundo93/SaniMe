import type { SupplyStatus } from '@sanime/domain';
import type { Dringlichkeit } from '../api/admin';
import { DRINGLICHKEIT, STATUS, type Ton } from '../fachtexte';

// Status immer als Symbol + Text, Farbe ist nur Zusatz (WCAG 1.4.1).
export function Etikett({ ton, symbol, children }: { ton: Ton; symbol?: string; children: string }) {
  return (
    <span className={`etikett etikett-${ton}`}>
      {symbol ? <span aria-hidden="true">{symbol}</span> : null}
      {children}
    </span>
  );
}

export function StatusEtikett({ status }: { status: SupplyStatus }) {
  const eintrag = STATUS[status];
  return (
    <Etikett ton={eintrag.ton} symbol={eintrag.symbol}>
      {eintrag.label}
    </Etikett>
  );
}

export function DringlichkeitEtikett({ dringlichkeit }: { dringlichkeit: Dringlichkeit }) {
  const eintrag = DRINGLICHKEIT[dringlichkeit];
  return (
    <Etikett ton={eintrag.ton} symbol={eintrag.symbol}>
      {eintrag.label}
    </Etikett>
  );
}
