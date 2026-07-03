import { SetMetadata } from '@nestjs/common';

export const AUDIT_READ_RESOURCE_TYPE = 'audit:read-resource-type';

// Marks a handler as reading sensitive data. AccessLogInterceptor picks this
// metadata up and writes an access_logs row after every successful response —
// the mechanism that makes Health-Data access-tracking structural rather than
// something a future contributor has to remember to add per-endpoint.
export const AuditRead = (resourceType: string) => SetMetadata(AUDIT_READ_RESOURCE_TYPE, resourceType);
