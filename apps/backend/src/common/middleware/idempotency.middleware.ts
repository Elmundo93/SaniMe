import { Injectable, NestMiddleware } from '@nestjs/common';
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { IdempotencyRepository } from '../../modules/idempotency/idempotency.repository';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function hashRequest(method: string, url: string, body: unknown): string {
  return createHash('sha256').update(JSON.stringify({ method, url, body: body ?? null })).digest('hex');
}

// Header-based, generic for any future mutating endpoint (Principle 9). A
// replayed request (same Idempotency-Key, same body) gets the stored
// response instead of re-running the handler; a reused key with a different
// body is rejected as a conflict.
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private readonly repository: IdempotencyRepository) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const key = req.header('idempotency-key');
    if (!MUTATING_METHODS.has(req.method) || !key) {
      next();
      return;
    }

    const requestHash = hashRequest(req.method, req.originalUrl, req.body);
    const existing = await this.repository.findByKey(key);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        res.status(409).json({
          statusCode: 409,
          message: 'Idempotency-Key wurde bereits mit einem anderen Request-Body verwendet',
        });
        return;
      }
      if (existing.responseStatus != null) {
        res.status(existing.responseStatus).json(existing.responseBody);
        return;
      }
      // Key seen, response not yet stored (in-flight or crashed mid-request) — let it proceed.
      next();
      return;
    }

    await this.repository.create(key, requestHash);

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      void this.repository.storeResponse(key, res.statusCode, body);
      return originalJson(body);
    };

    next();
  }
}
