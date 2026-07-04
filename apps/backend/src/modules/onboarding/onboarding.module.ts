import { Module } from '@nestjs/common';
import { AppointmentModule } from '../appointment/appointment.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { HealthDataModule } from '../health-data/health-data.module';
import { SupplyOrderModule } from '../supply-order/supply-order.module';
import { VerificationModule } from '../verification/verification.module';
import { ConsentsRepository } from '../consents/consents.repository';
import { OnboardingController } from './controllers/onboarding.controller';
import { OnboardingSessionsRepository } from './onboarding-sessions.repository';
import { OnboardingService } from './onboarding.service';

@Module({
  // AppointmentModule never imports OnboardingModule (verified) — one-directional,
  // no cycle. Needed so OnboardingService.proposeAppointmentSlots can call the
  // existing AppointmentsService.proposeSlots() instead of duplicating it.
  imports: [AppointmentModule, AuthModule, CatalogModule, HealthDataModule, SupplyOrderModule, VerificationModule],
  controllers: [OnboardingController],
  providers: [OnboardingSessionsRepository, ConsentsRepository, OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
