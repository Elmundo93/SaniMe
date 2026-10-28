import { render } from '@testing-library/react';
import { useEffect } from 'react';
import axe from 'axe-core';
import { MemoryRouter, useLocation } from 'react-router';
import { vi } from 'vitest';
import { App, erstelleQueryClient } from '../App';

export interface Antwort {
  status?: number;
  body?: unknown;
}

export type Route = (url: URL, init: RequestInit) => Antwort | undefined;

// fetch-Attrappe: jede Route bekommt Pfad und Anfrage; die erste, die eine
// Antwort liefert, gewinnt. Unbekannte Anfragen schlagen laut fehl.
export function fetchAttrappe(...routen: Route[]) {
  const aufrufe: { methode: string; pfad: string; body: unknown; headers: Record<string, string> }[] = [];
  const fetchMock = vi.fn(async (eingabe: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(eingabe), 'http://localhost');
    aufrufe.push({
      methode: init.method ?? 'GET',
      pfad: url.pathname + url.search,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      headers: (init.headers ?? {}) as Record<string, string>,
    });
    for (const route of routen) {
      const antwort = route(url, init);
      if (antwort) {
        const status = antwort.status ?? 200;
        return new Response(status === 204 ? null : JSON.stringify(antwort.body ?? {}), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    throw new Error(`Unerwartete Anfrage: ${init.method ?? 'GET'} ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return aufrufe;
}

export function wenn(methode: string, pfad: string | RegExp, antwort: Antwort | (() => Antwort)): Route {
  return (url, init) => {
    const passt = typeof pfad === 'string' ? url.pathname === `/api/v1${pfad}` : pfad.test(url.pathname);
    if (passt && (init.method ?? 'GET') === methode) return typeof antwort === 'function' ? antwort() : antwort;
    return undefined;
  };
}

export const PROFIL = { id: 'a1', email: 'anna@example.com', name: 'Anna Admin', permissions: ['orders:read', 'orders:write'] };

// Aktuelle Adresse für Prüfungen („wohin wurde umgeleitet?“).
export const ort = { pfad: '', suche: '' };

function OrtMerken() {
  const location = useLocation();
  useEffect(() => {
    ort.pfad = location.pathname;
    ort.suche = location.search;
  }, [location]);
  return null;
}

export function rendereApp(start: string) {
  const queryClient = erstelleQueryClient();
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  return render(
    <MemoryRouter initialEntries={[start]}>
      <OrtMerken />
      <App queryClient={queryClient} />
    </MemoryRouter>,
  );
}

// axe-core ohne Farbkontrast (jsdom rechnet kein Layout); Kontrast ist über
// die Design-Tokens in theme.ts abgesichert.
export async function erwarteBarrierefrei(element: Element) {
  const ergebnis = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });
  const verstoesse = ergebnis.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
  if (verstoesse.length > 0) throw new Error(`Barrierefreiheit verletzt:\n${verstoesse.join('\n')}`);
}
