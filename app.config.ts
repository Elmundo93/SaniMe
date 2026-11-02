import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json bleibt die Grundkonfiguration; hier kommt nur hinzu, was sich je
// Umgebung unterscheidet. SANIME_UMGEBUNG setzen die eas.json-Profile
// (testflight → dev, production → prod), lokal bleibt es „lokal“.
// Server: deploy/ (DevRunbooks projekte/sanime.md → „Server & Deploy“).
const API_URLS = {
  lokal: 'http://localhost:3000/api/v1',
  dev: 'https://api.sanime.info/api/v1',
  prod: 'https://api.sanime.online/api/v1',
} as const;

type Umgebung = keyof typeof API_URLS;

function umgebung(): Umgebung {
  const wert = process.env.SANIME_UMGEBUNG ?? 'lokal';
  if (!(wert in API_URLS)) {
    throw new Error(`SANIME_UMGEBUNG="${wert}" ist unbekannt — erlaubt: ${Object.keys(API_URLS).join(', ')}`);
  }
  return wert as Umgebung;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const u = umgebung();
  return {
    ...config,
    name: config.name ?? 'SaniMe',
    slug: config.slug ?? 'sanime',
    extra: {
      ...config.extra,
      umgebung: u,
      apiUrl: API_URLS[u],
    },
  };
};
