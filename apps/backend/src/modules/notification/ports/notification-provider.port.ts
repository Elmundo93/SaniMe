export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

export type NotificationChannel = 'push' | 'email';

export interface NotificationMessage {
  channel: NotificationChannel;
  target: string;
  title: string;
  // Free text — its key name never matches scrub()'s denylist (only key
  // names are matched, not content), so it must never carry health-data-
  // shaped content (diagnoses, insurance numbers, etc.), only generic
  // copy (e.g. "Dein Termin am ... steht bevor."). Layer 4.
  body: string;
}

// One concrete implementation now (LoggingNotificationProvider), swappable
// later for real push (expo-server-sdk) / email (nodemailer or a
// transactional API) without touching callers (Principle 7).
export interface NotificationProvider {
  send(message: NotificationMessage): Promise<void>;
}
