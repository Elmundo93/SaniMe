// Legt ein Admin-Konto für unser Team an (oder deaktiviert es), bis „Team &
// Rechte“ in der Admin-App existiert (Adminplan Phase 3).
//
//   npm run backend:admin-anlegen -- anna@example.com "Anna Beispiel" sachbearbeitung
//   npm run backend:admin-anlegen -- --deaktivieren anna@example.com
//
// Das Startpasswort wird zufällig erzeugt und genau einmal ausgegeben — bitte
// sicher übergeben (Passwortmanager, nie per Mail/Chat). Den zweiten Faktor
// richtet die Person beim ersten Login selbst ein.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { DRIZZLE, type Database } from '../src/db/client';
import { adminUsers, rolePermissions } from '../src/db/schema';
import { AuditService } from '../src/modules/audit/audit.service';
import { ROLLEN, type Rolle } from '../src/modules/auth/permissions';

function istRolle(wert: string | undefined): wert is Rolle {
  return wert !== undefined && wert in ROLLEN;
}

async function main() {
  const argumente = process.argv.slice(2);
  const deaktivieren = argumente[0] === '--deaktivieren';
  const [email, name, rolle] = deaktivieren ? [argumente[1]] : argumente;
  if (!email || !email.includes('@')) throw new Error('E-Mail-Adresse fehlt');
  if (!deaktivieren && (!name || !istRolle(rolle))) {
    throw new Error(`Aufruf: <email> "<Name>" <rolle> — Rollen: ${Object.keys(ROLLEN).join(', ')}`);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const db: Database = app.get(DRIZZLE);
    const audit = app.get(AuditService);
    const tenant = DEFAULT_TENANT_CONTEXT;

    if (deaktivieren) {
      const [admin] = await db.update(adminUsers).set({ deactivatedAt: new Date() }).where(eq(adminUsers.email, email)).returning({ id: adminUsers.id });
      if (!admin) throw new Error(`Kein Konto mit ${email}`);
      await audit.record({ tenant, actorType: 'system', actorId: null, eventType: 'AdminDeactivated', resourceType: 'admin_user', resourceId: admin.id });
      console.log(`${email} ist deaktiviert — der Zugang endet sofort, Notizen und Protokolle bleiben erhalten.`);
      return;
    }

    const [vorhanden] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (vorhanden) throw new Error(`Es gibt bereits ein Konto mit ${email}`);

    const passwort = randomBytes(15).toString('base64url');
    const [admin] = await db
      .insert(adminUsers)
      .values({ organizationId: tenant.organizationId, email, name: name!, passwordHash: await hash(passwort, 12) })
      .returning({ id: adminUsers.id });
    await db.insert(rolePermissions).values(ROLLEN[rolle as Rolle].map((permission) => ({ organizationId: tenant.organizationId, adminUserId: admin.id, permission })));
    await audit.record({
      tenant,
      actorType: 'system',
      actorId: null,
      eventType: 'AdminCreated',
      resourceType: 'admin_user',
      resourceId: admin.id,
      metadata: { rolle },
    });
    console.log(`Konto angelegt: ${name} <${email}>, Rolle ${rolle}`);
    console.log(`Startpasswort (wird nicht noch einmal angezeigt): ${passwort}`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
