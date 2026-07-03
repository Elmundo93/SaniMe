import { UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import type { AuditService } from '../../audit/audit.service';
import type { AdminUsersRepository } from '../admin-users.repository';
import { AdminAuthService } from './admin-auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

describe('AdminAuthService', () => {
  const admin = { id: 'admin-1', email: 'admin@example.com', passwordHash: 'hash', organizationId: 'org-1', createdAt: new Date() };

  function makeService(foundAdmin: typeof admin | null) {
    const adminUsers = { findByEmail: jest.fn().mockResolvedValue(foundAdmin) } as unknown as AdminUsersRepository;
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') } as any;
    const config = { getOrThrow: jest.fn().mockReturnValue('secret'), get: jest.fn().mockReturnValue('8h') } as any;
    const auditService = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    return { service: new AdminAuthService(adminUsers, jwt, config, auditService), auditService };
  }

  afterEach(() => jest.clearAllMocks());

  it('records AdminLoginSucceeded and returns a token on valid credentials', async () => {
    (compare as jest.Mock).mockResolvedValue(true);
    const { service, auditService } = makeService(admin);

    const result = await service.login('admin@example.com', 'correct-password', DEFAULT_TENANT_CONTEXT);

    expect(result.accessToken).toBe('signed-token');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'AdminLoginSucceeded', actorId: 'admin-1', resourceType: 'admin_user' }),
    );
  });

  it('records AdminLoginFailed with a null actorId when the email does not match any admin', async () => {
    const { service, auditService } = makeService(null);

    await expect(service.login('nobody@example.com', 'x', DEFAULT_TENANT_CONTEXT)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(compare).not.toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'AdminLoginFailed', actorId: null, metadata: { email: 'nobody@example.com' } }),
    );
  });

  it('records AdminLoginFailed with the matched actorId when the password is wrong', async () => {
    (compare as jest.Mock).mockResolvedValue(false);
    const { service, auditService } = makeService(admin);

    await expect(service.login('admin@example.com', 'wrong-password', DEFAULT_TENANT_CONTEXT)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'AdminLoginFailed', actorId: 'admin-1' }));
  });
});
