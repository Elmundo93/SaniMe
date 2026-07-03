import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import * as packageJson from '../../../package.json';
import { DrizzleHealthIndicator } from './indicators/drizzle-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly drizzleIndicator: DrizzleHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([() => this.drizzleIndicator.check('database')]);
  }

  @Get('version')
  version() {
    return {
      version: packageJson.version,
      commit: process.env.GIT_SHA ?? process.env.COMMIT_SHA ?? 'unknown',
    };
  }
}
