export const SMS_SENDER = Symbol('SMS_SENDER');

// Versandweg für SMS — austauschbar (seven.io, später ggf. ein anderer
// Anbieter), ohne dass die Code-Logik davon weiß.
export interface SmsSender {
  // false = es geht keine echte SMS raus (Dev): nur dann darf der Code in der
  // API-Antwort stehen.
  readonly echterVersand: boolean;
  send(to: string, text: string): Promise<void>;
}
