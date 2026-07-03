import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_LANGSEITE = 2500;
const JPEG_QUALITAET = 0.85;

function ermittleGroesse(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

// Normalisiert ein aufgenommenes Foto vor der Texterkennung: bakt die
// EXIF-Rotation in die Pixel ein (Vision/ML Kit interpretieren rotierte
// EXIF-Daten nicht immer zuverlässig) und begrenzt die Langseite, damit
// große Fotos nicht unnötig Speicher/Zeit kosten. Perspektivkorrektur,
// Entrauschen und Kontrastanpassung sind für v1 bewusst nicht enthalten —
// Apple Vision/ML Kit binarisieren intern bereits selbst; eine eigene
// Bildverarbeitungspipeline wäre für den ersten Durchlauf unverhältnismäßig.
export async function normalisiereBild(uri: string): Promise<string> {
  const { width, height } = await ermittleGroesse(uri);
  const langseite = Math.max(width, height);

  let context = ImageManipulator.manipulate(uri);
  if (langseite > MAX_LANGSEITE) {
    const faktor = MAX_LANGSEITE / langseite;
    context = context.resize({ width: Math.round(width * faktor), height: Math.round(height * faktor) });
  } else {
    // Kein Downscale nötig, aber renderAsync/saveAsync erzwingt trotzdem ein
    // Re-Encode, wodurch die EXIF-Rotation in die Pixel eingebacken wird.
    context = context.rotate(0);
  }

  const bild = await context.renderAsync();
  const ergebnis = await bild.saveAsync({ compress: JPEG_QUALITAET, format: SaveFormat.JPEG });
  return ergebnis.uri;
}
