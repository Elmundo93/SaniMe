import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import path from 'path';

// Liefert die gebaute Admin-App (apps/admin, `npm run admin:build`) unter
// /admin/ aus — dieselbe Domain wie /api, sonst käme das Sitzungscookie
// (SameSite=Strict, Path=/api) nicht an und es bräuchte CORS. Fehlt der Build,
// läuft das Backend ohne Admin-Oberfläche weiter (Entwicklung: Vite-Dev-Server).
//
// ADMIN_APP_DIR überschreibt den Pfad (z. B. im Container), ADMIN_APP_DIR=aus
// schaltet die Auslieferung ab.
export const ADMIN_PFAD = '/admin';

// Strenge CSP: nur eigene Skripte/Verbindungen. 'unsafe-inline' nur für
// Styles (theme.ts setzt die Farb-Variablen als <style>, React style-Attribute);
// data: für den QR-Code der 2FA-Einrichtung.
const SICHERHEITS_HEADER: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
};

export function adminAppVerzeichnis(): string | null {
  const konfiguriert = process.env.ADMIN_APP_DIR;
  if (konfiguriert === 'aus') return null;
  const verzeichnis = konfiguriert ? path.resolve(konfiguriert) : path.resolve(__dirname, '../../admin/dist');
  return existsSync(path.join(verzeichnis, 'index.html')) ? verzeichnis : null;
}

export function adminAppAusliefern(app: NestExpressApplication, verzeichnis: string) {
  const index = path.join(verzeichnis, 'index.html');

  app.use(ADMIN_PFAD, (_req: Request, res: Response, next: NextFunction) => {
    for (const [name, wert] of Object.entries(SICHERHEITS_HEADER)) res.setHeader(name, wert);
    next();
  });

  // Gehashte Dateien unter assets/ ändern sich nie → lange cachen.
  app.useStaticAssets(verzeichnis, {
    prefix: `${ADMIN_PFAD}/`,
    index: false,
    setHeaders: (res, datei) => {
      res.setHeader('Cache-Control', datei.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });

  // Alle übrigen /admin/…-Pfade sind Routen der App (Single-Page-App) →
  // index.html, nie zwischengespeichert, damit ein neues Deployment sofort greift.
  app.use(ADMIN_PFAD, (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.originalUrl === ADMIN_PFAD) return res.redirect(301, `${ADMIN_PFAD}/`);
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(index);
  });
}
