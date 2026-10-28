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
export * from './data-export.schema';
export * from './deletion-request.schema';
export * from './retention-policy.schema';
export * from './payment.schema';

import { accessLogs } from './access-logs.schema';
import { adminUsers } from './admin-users.schema';
import { orderNotes } from './admin.schema';
import { dataExportRequests } from './data-export.schema';
import { deletionRequests } from './deletion-request.schema';
import { retentionPolicies } from './retention-policy.schema';
import { payments } from './payment.schema';
import { appointments } from './appointment.schema';
import { auditEntries } from './audit-entries.schema';
import {
  catalogCategories,
  manufacturers,
  productImages,
  productRelations,
  products,
  productVariants,
  qaEntries,
  qaEntryLinks,
  supplierProducts,
  suppliers,
} from './catalog.schema';
import { consentGrants, consents } from './consents.schema';
import { customerAddresses, customerProfiles, customers } from './customers.schema';
import { documents, documentVersions } from './documents.schema';
import { insurancePolicies, ocrResults } from './health-data.schema';
import { idempotencyKeys } from './idempotency-keys.schema';
import { notifications, pushTokens } from './notification.schema';
import { onboardingSessionPositions, onboardingSessions } from './onboarding-sessions.schema';
import { organizations } from './organizations.schema';
import { rolePermissions } from './role-permissions.schema';
import { openActions, orders, orderStatusEvents, supplies, timelineEvents, urgentDeliveryRequests } from './supply-order.schema';
import { verificationCodes } from './verification-codes.schema';

export const schema = {
  organizations,
  adminUsers,
  rolePermissions,
  auditEntries,
  accessLogs,
  idempotencyKeys,
  consents,
  consentGrants,
  manufacturers,
  catalogCategories,
  products,
  suppliers,
  supplierProducts,
  productImages,
  productVariants,
  productRelations,
  qaEntries,
  qaEntryLinks,
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
  urgentDeliveryRequests,
  pushTokens,
  onboardingSessions,
  onboardingSessionPositions,
  verificationCodes,
  notifications,
  appointments,
  orderNotes,
  dataExportRequests,
  deletionRequests,
  retentionPolicies,
  payments,
};
