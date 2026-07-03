import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { AuditFixtureController } from './audit-fixture.controller';
import { AuditFixtureRepository } from './audit-fixture.repository';
import { IdempotencyFixtureController } from './idempotency-fixture.controller';

// TEMPORARY — only imported into AppModule when NODE_ENV !== 'production'
// (see app.module.ts). Delete this whole module once Layer 2 provides real
// endpoints to exercise the audit/idempotency mechanisms end-to-end instead.
@Module({
  imports: [AuthModule],
  controllers: [AuditFixtureController, IdempotencyFixtureController],
  providers: [AuditFixtureRepository],
})
export class TestFixturesModule {}
