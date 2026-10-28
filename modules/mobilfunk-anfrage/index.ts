import { requireOptionalNativeModule } from 'expo';

interface MobilfunkAnfrageModul {
  get(url: string): Promise<{ status: number; body: string }>;
}

// Nur in einem Build mit diesem Modul (iOS) vorhanden — sonst null, und die
// stille Prüfung fällt auf fetch bzw. die SMS zurück.
export const mobilfunkAnfrage = requireOptionalNativeModule<MobilfunkAnfrageModul>('MobilfunkAnfrage');
