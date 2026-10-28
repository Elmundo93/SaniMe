import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRoutes, type RouteObject } from 'react-router';
import { ApiFehler } from './api/client';
import { AnsageProvider } from './komponenten/Ansage';
import { Layout } from './komponenten/Layout';
import { Anmelden } from './seiten/Anmelden';
import { Arbeitskorb } from './seiten/Arbeitskorb';
import { NichtGefunden } from './seiten/NichtGefunden';
import { Versorgung } from './seiten/versorgung/Versorgung';
import { Versorgungen } from './seiten/Versorgungen';
import { SitzungProvider } from './sitzung/Sitzung';

const ROUTEN: RouteObject[] = [
  { path: '/anmelden', element: <Anmelden /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Arbeitskorb /> },
      { path: 'versorgungen', element: <Versorgungen /> },
      { path: 'versorgungen/:orderId', element: <Versorgung /> },
      { path: '*', element: <NichtGefunden /> },
    ],
  },
];

export function erstelleQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 4xx wiederholen bringt nichts (fehlende Rechte, nicht gefunden).
        retry: (versuche, fehler) => !(fehler instanceof ApiFehler && fehler.status >= 400 && fehler.status < 500) && versuche < 2,
        refetchOnWindowFocus: true,
        staleTime: 10_000,
      },
    },
  });
}

function Routen() {
  return useRoutes(ROUTEN);
}

// Ohne eigenen Router: main.tsx legt BrowserRouter darum, Tests MemoryRouter.
export function App({ queryClient }: { queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SitzungProvider>
        <AnsageProvider>
          <Routen />
        </AnsageProvider>
      </SitzungProvider>
    </QueryClientProvider>
  );
}
