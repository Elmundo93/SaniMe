import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import type { TenantContext } from '../../../common/repository/tenant-context';
import { AuditService } from '../../audit/audit.service';
import { AdminUsersRepository } from '../admin-users.repository';
import type { AdminJwtPayload } from '../strategies/admin-jwt.strategy';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminUsers: AdminUsersRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(email: string, password: string, tenant: TenantContext): Promise<{ accessToken: string }> {
    const admin = await this.adminUsers.findByEmail(email);
    const passwordValid = admin ? await compare(password, admin.passwordHash) : false;
    if (!admin || !passwordValid) {
      await this.auditService.record({
        tenant,
        actorType: 'admin',
        actorId: admin?.id ?? null,
        eventType: 'AdminLoginFailed',
        resourceType: 'admin_user',
        resourceId: admin?.id ?? null,
        metadata: { email },
      });
      throw new UnauthorizedException('E-Mail oder Passwort ist falsch');
    }

    const payload: AdminJwtPayload = { sub: admin.id, email: admin.email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('ADMIN_JWT_SECRET'),
      expiresIn: this.config.get<string>('ADMIN_JWT_EXPIRES_IN', '8h'),
    });

    await this.auditService.record({
      tenant,
      actorType: 'admin',
      actorId: admin.id,
      eventType: 'AdminLoginSucceeded',
      resourceType: 'admin_user',
      resourceId: admin.id,
    });
    return { accessToken };
  }
}
