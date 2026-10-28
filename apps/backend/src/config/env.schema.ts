import { z } from 'zod';

// dotenv loads an unset-but-declared `KEY=` line as an empty string, not
// undefined — `.optional()` alone only tolerates a genuinely absent key, so
// an empty string still fails a schema's own `.email()`/`.min()` constraint.
// Every optional env var with an extra format constraint needs this
// preprocessing, or a blank line in .env (the committed default for
// SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD) crashes startup instead of
// no-opping as intended.
function optionalWithEmptyAsUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => (val === '' ? undefined : val), schema.optional());
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL ist erforderlich'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  ADMIN_JWT_SECRET: z.string().min(1, 'ADMIN_JWT_SECRET ist erforderlich'),
  ADMIN_JWT_EXPIRES_IN: z.string().default('8h'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SEED_ADMIN_EMAIL: optionalWithEmptyAsUndefined(z.string().email()),
  SEED_ADMIN_PASSWORD: optionalWithEmptyAsUndefined(z.string().min(8)),
  STORAGE_ENDPOINT: z.string().min(1, 'STORAGE_ENDPOINT ist erforderlich'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_ACCESS_KEY_ID: z.string().min(1, 'STORAGE_ACCESS_KEY_ID ist erforderlich'),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1, 'STORAGE_SECRET_ACCESS_KEY ist erforderlich'),
  STORAGE_BUCKET: z.string().min(1, 'STORAGE_BUCKET ist erforderlich'),
  STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  VERIFICATION_CODE_PEPPER: z.string().min(1, 'VERIFICATION_CODE_PEPPER ist erforderlich'),
  // Optional like SENTRY_DSN — unset in dev/test means the app still boots,
  // PaymentService just throws a clear error the moment its endpoints are
  // actually called (same "fail loudly, never fake success" discipline as
  // SmsCodeVerificationProvider), rather than requiring real Stripe
  // credentials before anyone can even run `npm run backend:dev`.
  STRIPE_SECRET_KEY: optionalWithEmptyAsUndefined(z.string()),
  STRIPE_WEBHOOK_SECRET: optionalWithEmptyAsUndefined(z.string()),
  // SMS für die Telefonbestätigung (seven.io, Sitz in Deutschland). Ohne
  // Schlüssel: Dev-Versand (Code in der Antwort/im Log), in Produktion ein Fehler.
  SEVEN_API_KEY: optionalWithEmptyAsUndefined(z.string()),
  SMS_ABSENDER: z.string().max(11).default('SaniMe'),
  // Push direkt über APNs (siehe ApnsNotificationProvider).
  APNS_KEY_ID: optionalWithEmptyAsUndefined(z.string()),
  APNS_TEAM_ID: optionalWithEmptyAsUndefined(z.string()),
  APNS_PRIVATE_KEY: optionalWithEmptyAsUndefined(z.string()),
  APNS_BUNDLE_ID: optionalWithEmptyAsUndefined(z.string()),
  APNS_PRODUCTION: optionalWithEmptyAsUndefined(z.string()),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Ungültige Umgebungsvariablen:\n${result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return result.data;
}
