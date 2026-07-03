import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { scrub } from './common/logging/scrub';
import { StructuredLoggerService } from './common/logging/structured-logger.service';

// Run via `ts-node` (package.json's start/start:dev scripts), not `nest
// build && node dist/main.js`. @sanime/domain is deliberately raw
// TypeScript with no build step (package.json's `main`/`types` point
// straight at index.ts — see packages/@sanime/design-system for the same
// convention), which Metro's bundler resolves fine for the mobile app.
// Plain compiled `node dist/...js` reaching into that raw .ts via `require`
// hits Node's own native TS/ESM handling, which enforces strict ESM
// extension resolution and fails on @sanime/domain's extensionless internal
// imports (`export * from './types'`). ts-node's own `.ts` require hook
// resolves it correctly instead — the same mechanism the db:seed scripts
// (via tsx) and the Jest suites (via ts-jest) already rely on.

// Sentry is initialized before the Nest app is created — beforeSend
// scrubbing is wired from the very first route, not deferred to a later
// layer (Principle 13).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
    beforeSend(event) {
      return scrub(event) as typeof event;
    },
    // beforeSend alone doesn't reach breadcrumbs recorded before the event —
    // Sentry's default HTTP integration creates breadcrumbs keyed like
    // {category: 'http', data: {url: ...}}, and neither `data` nor `url`
    // matches scrub()'s key-name denylist, so without this hook a
    // health-data value embedded in a request URL would bypass redaction
    // entirely (Layer 4).
    beforeBreadcrumb(breadcrumb) {
      return scrub(breadcrumb) as typeof breadcrumb;
    },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(StructuredLoggerService));
  app.enableShutdownHooks();
  configureApp(app);
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
