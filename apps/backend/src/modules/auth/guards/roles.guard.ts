import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS } from '../decorators/roles.decorator';
import { RolePermissionsRepository } from '../role-permissions.repository';

// Runs after AdminJwtAuthGuard (which populates req.admin). Checks every
// required permission against role_permissions — active from Layer 1 per
// work/Backendsprint.md's "Bereits getroffene Entscheidungen".
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolePermissions: RolePermissionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string[] | undefined>(REQUIRED_PERMISSIONS, context.getHandler());
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const admin = request.admin;
    if (!admin) {
      throw new ForbiddenException('Kein authentifizierter Admin');
    }

    for (const permission of required) {
      if (!(await this.rolePermissions.hasPermission(admin.id, permission))) {
        throw new ForbiddenException(`Fehlende Berechtigung: ${permission}`);
      }
    }
    return true;
  }
}
