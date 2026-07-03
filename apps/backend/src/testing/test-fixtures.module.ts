import { Module } from '@nestjs/common';
import { IdempotencyFixtureController } from './idempotency-fixture.controller';

// TEMPORARY — only imported into AppModule when NODE_ENV !== 'production'
// (see app.module.ts). The audit-fixture half of this module was retired in
// Layer 4 (Compliance) once real @AuditRead()-decorated endpoints existed
// (GET /supplies, /orders/:id, /admin/orders(/:id), /admin/inbox,
// /documents/:id) — see supply-order/documents/admin controllers. Delete the
// rest of this module once Layer 2's real mutating endpoints (already live)
// make IdempotencyFixtureController redundant too.
@Module({
  controllers: [IdempotencyFixtureController],
})
export class TestFixturesModule {}
