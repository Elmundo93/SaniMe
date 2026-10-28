import { HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import type { AuditService } from '../../audit/audit.service';
import type { AdminUsersRepository } from '../admin-users.repository';
import { erzeugeTotpGeheimnis, totpCode, verschluesseleGeheimnis } from '../admin-totp';
import type { RolePermissionsRepository } from '../role-permissions.repository';
import { AdminAuthService } from './admin-auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const SECRET = 'test-secret';

describe('AdminAuthService', () => {
  const basis = {
    id: 'admin-1',
    email: 'admin@example.com',
    passwordHash: 'hash',
    organizationId: 'org-1',
    createdAt: new Date(),
    name: 'Anna',
    totpSecretEncrypted: null as string | null,
    totpActivatedAt: null as Date | null,
    deactivatedAt: null as Date | null,
    lastLoginAt: null as Date | null,
  };

  function makeService(foundAdmin: typeof basis | null) {
    const adminUsers = {
      findByEmail: jest.fn().mockResolvedValue(foundAdmin),
      findById: jest.fn().mockResolvedValue(foundAdmin),
      setTotpSecret: jest.fn(),
      activateTotp: jest.fn(),
      recordLogin: jest.fn(),
    } as unknown as AdminUsersRepository;
    const config = { getOrThrow: jest.fn().mockReturnValue(SECRET), get: jest.fn().mockReturnValue('8h') } as any;
    const auditService = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const rolePermissions = { listForAdmin: jest.fn().mockResolvedValue(['orders:read']) } as unknown as RolePermissionsRepository;
    const service = new AdminAuthService(adminUsers, new JwtService({}), config, auditService, rolePermissions);
    return { service, auditService, adminUsers };
  }

  afterEach(() => jest.clearAllMocks());

  it('verlangt beim ersten Login die 2FA-Einrichtung und gibt nie direkt eine Sitzung aus', async () => {
    (compare as jest.Mock).mockResolvedValue(true);
    const { service, adminUsers } = makeService({ ...basis });

    const result = await service.login('admin@example.com', 'richtig', DEFAULT_TENANT_CONTEXT);

    expect(result.schritt).toBe('einrichten');
    expect(result).not.toHaveProperty('accessToken');
    expect(adminUsers.setTotpSecret).toHaveBeenCalled();
    if (result.schritt === 'einrichten') expect(result.otpauthUrl).toContain(result.geheimnis);
  });

  it('akzeptiert einen gültigen Code, aktiviert die 2FA und protokolliert den Login', async () => {
    const geheimnis = erzeugeTotpGeheimnis();
    const admin = { ...basis, totpSecretEncrypted: verschluesseleGeheimnis(geheimnis, SECRET) };
    (compare as jest.Mock).mockResolvedValue(true);
    const { service, auditService, adminUsers } = makeService(admin);

    const login = await service.login('admin@example.com', 'richtig', DEFAULT_TENANT_CONTEXT);
    const ergebnis = await service.bestaetigeCode(login.challengeToken, totpCode(geheimnis, Date.now()), DEFAULT_TENANT_CONTEXT);

    expect(ergebnis).toEqual({ id: 'admin-1', email: 'admin@example.com' });
    expect(adminUsers.activateTotp).toHaveBeenCalledWith('admin-1');
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'AdminLoginSucceeded', actorId: 'admin-1' }));
  });

  it('lehnt einen falschen Code ab und sperrt nach fünf Fehlversuchen', async () => {
    const geheimnis = erzeugeTotpGeheimnis();
    const admin = { ...basis, totpSecretEncrypted: verschluesseleGeheimnis(geheimnis, SECRET), totpActivatedAt: new Date() };
    (compare as jest.Mock).mockResolvedValue(true);
    const { service } = makeService(admin);
    const login = await service.login('admin@example.com', 'richtig', DEFAULT_TENANT_CONTEXT);
    expect(login.schritt).toBe('code');

    const falsch = totpCode(geheimnis, Date.now()) === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await expect(service.bestaetigeCode(login.challengeToken, falsch, DEFAULT_TENANT_CONTEXT)).rejects.toBeInstanceOf(UnauthorizedException);
    }
    await expect(service.bestaetigeCode(login.challengeToken, totpCode(geheimnis, Date.now()), DEFAULT_TENANT_CONTEXT)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('akzeptiert kein fremdes Token als Zwischenschritt', async () => {
    const { service } = makeService({ ...basis });
    const zugang = await new JwtService({}).signAsync({ sub: 'admin-1', typ: 'access' }, { secret: SECRET });
    await expect(service.bestaetigeCode(zugang, '123456', DEFAULT_TENANT_CONTEXT)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('records AdminLoginFailed with a null actorId when the email does not match any admin', async () => {
    const { service, auditService } = makeService(null);

    await expect(service.login('nobody@example.com', 'x', DEFAULT_TENANT_CONTEXT)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(compare).not.toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'AdminLoginFailed', actorId: null, metadata: { email: 'nobody@example.com' } }),
    );
  });

  it('behandelt eine deaktivierte Person wie falsche Zugangsdaten', async () => {
    (compare as jest.Mock).mockResolvedValue(true);
    const { service, auditService } = makeService({ ...basis, deactivatedAt: new Date() });

    await expect(service.login('admin@example.com', 'richtig', DEFAULT_TENANT_CONTEXT)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'AdminLoginFailed', actorId: 'admin-1' }));
  });
});
