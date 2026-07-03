export * from './organizations.schema';
export * from './admin-users.schema';
export * from './role-permissions.schema';
export * from './audit-entries.schema';
export * from './access-logs.schema';
export * from './idempotency-keys.schema';
export * from './consents.schema';
export * from './catalog.schema';
export * from './documents.schema';
export * from './customers.schema';
export * from './health-data.schema';
export * from './supply-order.schema';
export * from './onboarding-sessions.schema';
export * from './verification-codes.schema';
export * from './notification.schema';
export * from './appointment.schema';
export * from './admin.schema';

import { accessLogs } from './access-logs.schema';
import { adminUsers } from './admin-users.schema';
import { orderNotes } from './admin.schema';
import { appointments } from './appointment.schema';
import { auditEntries } from './audit-entries.schema';
import { catalogCategories, manufacturers, products, supplierProducts, suppliers } from './catalog.schema';
import { consents } from './consents.schema';
import { customerAddresses, customerProfiles, customers } from './customers.schema';
import { documents, documentVersions } from './documents.schema';
import { insurancePolicies, ocrResults } from './health-data.schema';
import { idempotencyKeys } from './idempotency-keys.schema';
import { notifications } from './notification.schema';
import { onboardingSessions } from './onboarding-sessions.schema';
import { organizations } from './organizations.schema';
import { rolePermissions } from './role-permissions.schema';
import { openActions, orders, orderStatusEvents, supplies, timelineEvents } from './supply-order.schema';
import { verificationCodes } from './verification-codes.schema';

export const schema = {
  organizations,
  adminUsers,
  rolePermissions,
  auditEntries,
  accessLogs,
  idempotencyKeys,
  consents,
  manufacturers,
  catalogCategories,
  products,
  suppliers,
  supplierProducts,
  documents,
  documentVersions,
  customers,
  customerProfiles,
  customerAddresses,
  insurancePolicies,
  ocrResults,
  supplies,
  orders,
  orderStatusEvents,
  timelineEvents,
  openActions,
  onboardingSessions,
  verificationCodes,
  notifications,
  appointments,
  orderNotes,
};
