import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';

// Shared by main.ts AND e2e tests so prod and test bootstrap can never
// silently drift (a common NestJS e2e pitfall).
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  return app;
}
