export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

export type NotificationChannel = 'push' | 'email';

export interface NotificationMessage {
  channel: NotificationChannel;
  target: string;
  title: string;
  body: string;
}

// One concrete implementation now (LoggingNotificationProvider), swappable
// later for real push (expo-server-sdk) / email (nodemailer or a
// transactional API) without touching callers (Principle 7).
export interface NotificationProvider {
  send(message: NotificationMessage): Promise<void>;
}
