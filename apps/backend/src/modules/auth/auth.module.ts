import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { OnboardingSessionsRepository } from '../onboarding/onboarding-sessions.repository';
import { CustomerSessionSecretAdapter } from '../onboarding/ports/customer-session-secret.adapter';
import { AdminUsersRepository } from './admin-users.repository';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AnyPrincipalAuthGuard } from './guards/any-principal-auth.guard';
import { CustomerSessionAuthGuard } from './guards/customer-session-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CUSTOMER_SESSION_SECRET_PORT } from './ports/customer-session-secret.port';
import { RolePermissionsRepository } from './role-permissions.repository';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { CustomerSessionStrategy } from './strategies/customer-session.strategy';

// CustomerSessionSecretAdapter + OnboardingSessionsRepository are "leaf"
// providers (only need DRIZZLE) registered directly here rather than via a
// Nest-module import of OnboardingModule — avoids a circular module
// dependency (Onboarding needs AuthModule's guards/decorators).
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AdminAuthController],
  providers: [
    AdminJwtStrategy,
    AdminJwtAuthGuard,
    CustomerSessionStrategy,
    CustomerSessionAuthGuard,
    AnyPrincipalAuthGuard,
    RolesGuard,
    AdminUsersRepository,
    RolePermissionsRepository,
    AdminAuthService,
    OnboardingSessionsRepository,
    { provide: CUSTOMER_SESSION_SECRET_PORT, useClass: CustomerSessionSecretAdapter },
  ],
  exports: [AdminJwtAuthGuard, CustomerSessionAuthGuard, AnyPrincipalAuthGuard, RolesGuard],
})
export class AuthModule {}
