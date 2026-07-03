import { Module } from '@nestjs/common';
import { InsurancePoliciesRepository } from './insurance-policies.repository';
import { OcrResultsRepository } from './ocr-results.repository';

// No controller — consumed internally by Onboarding (Phase 2.6), which
// writes during OCR events and reads on GET .../current. See
// health-data.schema.ts for the access-log placement reasoning.
@Module({
  providers: [InsurancePoliciesRepository, OcrResultsRepository],
  exports: [InsurancePoliciesRepository, OcrResultsRepository],
})
export class HealthDataModule {}
