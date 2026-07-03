import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { AdminUsersRepository } from '../admin-users.repository';
import type { AdminJwtPayload } from '../strategies/admin-jwt.strategy';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminUsers: AdminUsersRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const admin = await this.adminUsers.findByEmail(email);
    if (!admin || !(await compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('E-Mail oder Passwort ist falsch');
    }

    const payload: AdminJwtPayload = { sub: admin.id, email: admin.email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('ADMIN_JWT_SECRET'),
      expiresIn: this.config.get<string>('ADMIN_JWT_EXPIRES_IN', '8h'),
    });
    return { accessToken };
  }
}
