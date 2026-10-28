import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import type { TenantContext } from '../../../common/repository/tenant-context';
import { AuditService } from '../../audit/audit.service';
import { AdminUsersRepository } from '../admin-users.repository';
import {
  entschluesseleGeheimnis,
  erzeugeTotpGeheimnis,
  otpauthUrl,
  pruefeTotpCode,
  verschluesseleGeheimnis,
} from '../admin-totp';
import { RolePermissionsRepository } from '../role-permissions.repository';

// Anmeldung in zwei Schritten: Passwort → kurzlebiges Zwischen-Token (typ
// 'mfa', 5 min) → TOTP-Code → Sitzung (AdminSessionService). Wer noch keinen
// zweiten Faktor hat, richtet ihn im zweiten Schritt ein; ein Zugang ohne
// 2FA ist nicht möglich (Gesundheitsdaten, Art. 9 DSGVO).
export type LoginErgebnis =
  | { schritt: 'code'; challengeToken: string }
  | { schritt: 'einrichten'; challengeToken: string; geheimnis: string; otpauthUrl: string };

export interface AdminProfil {
  id: string;
  email: string;
  name: string;
  permissions: string[];
}

const FALSCHE_DATEN = 'E-Mail oder Passwort ist falsch';
const MAX_FEHLVERSUCHE = 5;
const SPERRE_MS = 15 * 60 * 1000;

interface Sperrzaehler {
  fehler: number;
  gesperrtBis: number;
}

@Injectable()
export class AdminAuthService {
  // Im Speicher: reicht für eine Instanz im Pilotbetrieb. Mit mehreren
  // Instanzen gehört das in Postgres/Redis (gleiche Schnittstelle).
  private readonly fehlversuche = new Map<string, Sperrzaehler>();

  constructor(
    private readonly adminUsers: AdminUsersRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly rolePermissions: RolePermissionsRepository,
  ) {}

  private get secret() {
    return this.config.getOrThrow<string>('ADMIN_JWT_SECRET');
  }

  private pruefeSperre(schluessel: string) {
    const eintrag = this.fehlversuche.get(schluessel);
    if (eintrag && eintrag.gesperrtBis > Date.now()) {
      throw new HttpException(
        'Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es dann erneut.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private merkeFehlversuch(schluessel: string) {
    const eintrag = this.fehlversuche.get(schluessel) ?? { fehler: 0, gesperrtBis: 0 };
    eintrag.fehler += 1;
    if (eintrag.fehler >= MAX_FEHLVERSUCHE) {
      eintrag.fehler = 0;
      eintrag.gesperrtBis = Date.now() + SPERRE_MS;
    }
    this.fehlversuche.set(schluessel, eintrag);
  }

  async login(email: string, password: string, tenant: TenantContext): Promise<LoginErgebnis> {
    const sperrSchluessel = `email:${email.trim().toLowerCase()}`;
    this.pruefeSperre(sperrSchluessel);

    const admin = await this.adminUsers.findByEmail(email);
    const passwordValid = admin ? await compare(password, admin.passwordHash) : false;
    if (!admin || !passwordValid || admin.deactivatedAt) {
      this.merkeFehlversuch(sperrSchluessel);
      await this.auditService.record({
        tenant,
        actorType: 'admin',
        actorId: admin?.id ?? null,
        eventType: 'AdminLoginFailed',
        resourceType: 'admin_user',
        resourceId: admin?.id ?? null,
        metadata: { email },
      });
      throw new UnauthorizedException(FALSCHE_DATEN);
    }
    this.fehlversuche.delete(sperrSchluessel);

    const challengeToken = await this.jwt.signAsync({ sub: admin.id, typ: 'mfa' }, { secret: this.secret, expiresIn: '5m' });

    if (admin.totpActivatedAt && admin.totpSecretEncrypted) {
      return { schritt: 'code', challengeToken };
    }
    // Einrichtung läuft noch: dasselbe Geheimnis wiederverwenden, damit ein
    // schon gescannter QR-Code beim zweiten Versuch weiter passt.
    const geheimnis = admin.totpSecretEncrypted
      ? entschluesseleGeheimnis(admin.totpSecretEncrypted, this.secret)
      : erzeugeTotpGeheimnis();
    if (!admin.totpSecretEncrypted) {
      await this.adminUsers.setTotpSecret(admin.id, verschluesseleGeheimnis(geheimnis, this.secret));
    }
    return { schritt: 'einrichten', challengeToken, geheimnis, otpauthUrl: otpauthUrl(geheimnis, admin.email) };
  }

  // Zweiter Schritt. Liefert die Person zurück; die Sitzung (Cookie) stellt
  // der Controller über AdminSessionService aus.
  async bestaetigeCode(challengeToken: string, code: string, tenant: TenantContext) {
    let adminId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; typ?: string }>(challengeToken, { secret: this.secret });
      if (payload.typ !== 'mfa') throw new Error('falscher Typ');
      adminId = payload.sub;
    } catch {
      throw new UnauthorizedException('Die Anmeldung ist abgelaufen. Bitte gib E-Mail und Passwort erneut ein.');
    }

    const sperrSchluessel = `admin:${adminId}`;
    this.pruefeSperre(sperrSchluessel);
    const admin = await this.adminUsers.findById(adminId);
    if (!admin || admin.deactivatedAt || !admin.totpSecretEncrypted) {
      throw new UnauthorizedException('Die Anmeldung ist abgelaufen. Bitte gib E-Mail und Passwort erneut ein.');
    }

    const geheimnis = entschluesseleGeheimnis(admin.totpSecretEncrypted, this.secret);
    if (!pruefeTotpCode(geheimnis, code)) {
      this.merkeFehlversuch(sperrSchluessel);
      await this.auditService.record({
        tenant,
        actorType: 'admin',
        actorId: admin.id,
        eventType: 'AdminSecondFactorFailed',
        resourceType: 'admin_user',
        resourceId: admin.id,
      });
      throw new UnauthorizedException('Der Code stimmt nicht. Bitte gib den aktuellen 6-stelligen Code aus deiner Authenticator-App ein.');
    }
    this.fehlversuche.delete(sperrSchluessel);

    if (!admin.totpActivatedAt) {
      await this.adminUsers.activateTotp(admin.id);
      await this.auditService.record({
        tenant,
        actorType: 'admin',
        actorId: admin.id,
        eventType: 'AdminSecondFactorActivated',
        resourceType: 'admin_user',
        resourceId: admin.id,
      });
    }
    await this.adminUsers.recordLogin(admin.id);
    await this.auditService.record({
      tenant,
      actorType: 'admin',
      actorId: admin.id,
      eventType: 'AdminLoginSucceeded',
      resourceType: 'admin_user',
      resourceId: admin.id,
    });
    return { id: admin.id, email: admin.email };
  }

  async profil(adminId: string): Promise<AdminProfil> {
    const admin = await this.adminUsers.findById(adminId);
    if (!admin || admin.deactivatedAt) throw new UnauthorizedException('Bitte melde dich an.');
    const permissions = await this.rolePermissions.listForAdmin(admin.id);
    return { id: admin.id, email: admin.email, name: admin.name, permissions };
  }

  async abmelden(adminId: string, tenant: TenantContext) {
    await this.auditService.record({
      tenant,
      actorType: 'admin',
      actorId: adminId,
      eventType: 'AdminLoggedOut',
      resourceType: 'admin_user',
      resourceId: adminId,
    });
  }
}
