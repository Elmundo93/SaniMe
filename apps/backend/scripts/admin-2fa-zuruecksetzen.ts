// Setzt den zweiten Faktor einer Admin-Person zurück (Handy verloren o. Ä.).
// Beim nächsten Login richtet sie ihn neu ein. Bis „Team & Rechte“ in der
// Admin-App existiert (Adminplan Phase 3), ist das der Weg dafür.
//
//   npm run backend:admin-2fa-zuruecksetzen -- anna@example.com
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { DRIZZLE, type Database } from '../src/db/client';
import { adminUsers } from '../src/db/schema';
import { AuditService } from '../src/modules/audit/audit.service';

async function main() {
  const [email] = process.argv.slice(2);
  if (!email) throw new Error('E-Mail-Adresse fehlt: npm run backend:admin-2fa-zuruecksetzen -- <email>');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const db: Database = app.get(DRIZZLE);
    const [admin] = await db
      .update(adminUsers)
      .set({ totpSecretEncrypted: null, totpActivatedAt: null })
      .where(eq(adminUsers.email, email))
      .returning({ id: adminUsers.id });
    if (!admin) throw new Error(`Keine Admin-Person mit ${email}`);
    await app.get(AuditService).record({
      tenant: DEFAULT_TENANT_CONTEXT,
      actorType: 'system',
      actorId: null,
      eventType: 'AdminSecondFactorReset',
      resourceType: 'admin_user',
      resourceId: admin.id,
    });
    console.log(`2FA für ${email} zurückgesetzt — beim nächsten Login wird sie neu eingerichtet.`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
