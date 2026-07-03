import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { DEFAULT_TENANT_CONTEXT } from '../repository/tenant-context';
import { AUDIT_READ_RESOURCE_TYPE } from './audit-read.decorator';

interface RequestWithActor extends Request {
  admin?: { id: string };
  customer?: { sessionId: string; customerId: string | null };
}

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const resourceType = this.reflector.get<string | undefined>(AUDIT_READ_RESOURCE_TYPE, context.getHandler());
    if (!resourceType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithActor>();

    return next.handle().pipe(
      tap(() => {
        const actorType = request.admin ? 'admin' : request.customer ? 'customer' : 'system';
        const actorId = request.admin?.id ?? request.customer?.customerId ?? request.customer?.sessionId ?? null;
        void this.auditService.recordAccess({
          tenant: DEFAULT_TENANT_CONTEXT,
          actorType,
          actorId,
          resourceType,
          resourceId: typeof request.params?.id === 'string' ? request.params.id : null,
        });
      }),
    );
  }
}
