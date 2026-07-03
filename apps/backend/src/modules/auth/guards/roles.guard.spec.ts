import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { RolePermissionsRepository } from '../role-permissions.repository';
import { RolesGuard } from './roles.guard';

function makeContext(admin: { id: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ admin }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request through when the handler requires no permissions', async () => {
    const reflector = { get: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const rolePermissions = { hasPermission: jest.fn() } as unknown as RolePermissionsRepository;
    const guard = new RolesGuard(reflector, rolePermissions);

    await expect(guard.canActivate(makeContext({ id: 'admin-1' }))).resolves.toBe(true);
    expect(rolePermissions.hasPermission).not.toHaveBeenCalled();
  });

  it('throws when there is no authenticated admin at all', async () => {
    const reflector = { get: jest.fn().mockReturnValue(['orders:read']) } as unknown as Reflector;
    const rolePermissions = { hasPermission: jest.fn() } as unknown as RolePermissionsRepository;
    const guard = new RolesGuard(reflector, rolePermissions);

    await expect(guard.canActivate(makeContext(undefined))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the request through when the admin holds every required permission', async () => {
    const reflector = { get: jest.fn().mockReturnValue(['orders:read', 'orders:write']) } as unknown as Reflector;
    const rolePermissions = { hasPermission: jest.fn().mockResolvedValue(true) } as unknown as RolePermissionsRepository;
    const guard = new RolesGuard(reflector, rolePermissions);

    await expect(guard.canActivate(makeContext({ id: 'admin-1' }))).resolves.toBe(true);
    expect(rolePermissions.hasPermission).toHaveBeenCalledWith('admin-1', 'orders:read');
    expect(rolePermissions.hasPermission).toHaveBeenCalledWith('admin-1', 'orders:write');
  });

  it('throws when the admin is missing even one required permission', async () => {
    const reflector = { get: jest.fn().mockReturnValue(['orders:read', 'compliance:manage']) } as unknown as Reflector;
    const rolePermissions = {
      hasPermission: jest.fn().mockImplementation((_id: string, permission: string) => Promise.resolve(permission === 'orders:read')),
    } as unknown as RolePermissionsRepository;
    const guard = new RolesGuard(reflector, rolePermissions);

    await expect(guard.canActivate(makeContext({ id: 'admin-1' }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
