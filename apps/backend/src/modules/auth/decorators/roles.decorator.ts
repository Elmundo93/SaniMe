import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS = 'auth:required-permissions';

export const Roles = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);
