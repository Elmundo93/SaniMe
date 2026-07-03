import { extractTextFromImage, isSupported } from 'expo-text-extractor';

// Einziger Ort mit Abhängigkeit auf die native OCR-Engine (Apple Vision auf
// iOS, Google ML Kit auf Android via expo-text-extractor). Ein Austausch oder
// eine zusätzliche Engine (z.B. Cloud-Fallback) ändert nur diese Datei.
export async function extrahiereText(uri: string): Promise<string[]> {
  if (!isSupported) {
    throw new Error('Texterkennung wird auf diesem Gerät nicht unterstützt.');
  }
  return extractTextFromImage(uri);
}
