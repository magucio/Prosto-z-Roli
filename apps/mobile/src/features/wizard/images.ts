import { LIMITS } from '@pzr/shared';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type ProcessedImage = { uri: string; width: number; height: number; base64: string; bytes: number };

// Zmniejszenie do 1600 px i ponowne zakodowanie JPEG. Nowy plik nie zawiera metadanych EXIF (w tym GPS z aparatu).
export async function processImage(sourceUri: string): Promise<ProcessedImage> {
  const ctx = ImageManipulator.manipulate(sourceUri, {
    maxWidth: LIMITS.imageMaxSidePx,
    maxHeight: LIMITS.imageMaxSidePx,
  });
  const image = await ctx.renderAsync();
  for (const compress of [LIMITS.imageJpegQuality, 0.6, 0.45]) {
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    const base64 = result.base64 ?? '';
    const bytes = Math.floor((base64.length * 3) / 4);
    if (bytes <= LIMITS.imageMaxBytes) {
      return { uri: result.uri, width: result.width, height: result.height, base64, bytes };
    }
  }
  throw new Error('image_too_large');
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// Ochrona przed EXIF także przy wysyłce: plik JPEG nie może zawierać segmentu APP1 „Exif”.
export function hasExif(bytes: Uint8Array): boolean {
  for (let i = 2; i + 9 < Math.min(bytes.length, 65536); i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xe1 && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78 && bytes[i + 6] === 0x69 && bytes[i + 7] === 0x66) {
      return true;
    }
  }
  return false;
}
