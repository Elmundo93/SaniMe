import { Body, Controller, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';

// TEMPORARY — proves IdempotencyMiddleware end-to-end before any real
// mutating business endpoint exists. Delete once Layer 2 provides one
// (e.g. POST /onboarding-sessions).
@Controller('_test/idempotency-fixture')
export class IdempotencyFixtureController {
  @Post()
  create(@Body() body: unknown) {
    return { id: randomUUID(), received: body ?? null };
  }
}
