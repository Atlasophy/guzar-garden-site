import 'server-only';
import sharp from 'sharp';
import type { Metadata } from 'sharp';

/**
 * Meal photographs, on the way in.
 *
 * The file's own bytes decide what it is, not its extension and not the
 * `Content-Type` the browser volunteered — both are attacker-controlled. A
 * `.jpg` that is really an SVG would otherwise be stored in a public bucket and
 * served back with script inside it.
 *
 * What happens to an accepted file:
 *   • orientation from EXIF is applied to the pixels, then all metadata is
 *     dropped — a phone photo of a plate should not carry the GPS coordinates
 *     of the kitchen into a public bucket;
 *   • a WebP display version is produced at a sensible maximum size;
 *   • a thumbnail is produced for the staff list and the menu grid;
 *   • aspect ratio is preserved throughout, and the real dimensions are
 *     recorded so `next/image` can reserve the space and not shift the layout.
 */

export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

/** Longest edge of the display image. */
export const DISPLAY_MAX_EDGE = 1600;
export const THUMBNAIL_MAX_EDGE = 400;

export interface ProcessedImage {
  display: { buffer: Buffer; width: number; height: number; mime: 'image/webp' };
  thumbnail: { buffer: Buffer; width: number; height: number; mime: 'image/webp' };
  original: { format: string; width: number; height: number; bytes: number };
}

export type ImageValidationFailure =
  | 'empty'
  | 'too_large'
  | 'unsupported_format'
  | 'not_an_image'
  | 'dimensions_unreadable'
  | 'too_small'
  | 'decompression_bomb';

export class ImageValidationError extends Error {
  constructor(readonly reason: ImageValidationFailure) {
    super(reason);
    this.name = 'ImageValidationError';
  }
}

/**
 * Sniff the real format from the leading bytes.
 *
 * Deliberately a short allow-list rather than "anything sharp can open": sharp
 * happily decodes SVG and GIF, and neither belongs in a menu-photo bucket.
 */
export function sniffImageFormat(buffer: Buffer): AcceptedMimeType | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

export interface ProcessOptions {
  maxBytes: number;
  displayMaxEdge?: number;
  thumbnailMaxEdge?: number;
}

export async function processMenuImage(
  input: Buffer,
  options: ProcessOptions,
): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageValidationError('empty');
  if (input.length > options.maxBytes) throw new ImageValidationError('too_large');

  const sniffed = sniffImageFormat(input);
  if (!sniffed) throw new ImageValidationError('unsupported_format');

  // `limitInputPixels` caps the decoded size, so a small file that claims to be
  // 50000×50000 cannot exhaust memory before anything else has a chance to
  // reject it.
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 100_000_000 }).metadata();
  } catch {
    throw new ImageValidationError('not_an_image');
  }

  if (!metadata.width || !metadata.height) {
    throw new ImageValidationError('dimensions_unreadable');
  }
  if (metadata.width < 200 || metadata.height < 200) {
    throw new ImageValidationError('too_small');
  }
  if (metadata.width * metadata.height > 60_000_000) {
    throw new ImageValidationError('decompression_bomb');
  }

  const displayEdge = options.displayMaxEdge ?? DISPLAY_MAX_EDGE;
  const thumbEdge = options.thumbnailMaxEdge ?? THUMBNAIL_MAX_EDGE;

  // `.rotate()` with no argument bakes the EXIF orientation into the pixels.
  // Doing it before the metadata is dropped is the whole reason for the order:
  // strip first and a portrait photo comes out on its side.
  const base = sharp(input, { limitInputPixels: 100_000_000 }).rotate();

  const displayBuffer = await base
    .clone()
    .resize({ width: displayEdge, height: displayEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const thumbnailBuffer = await base
    .clone()
    .resize({ width: thumbEdge, height: thumbEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 76, effort: 4 })
    .toBuffer();

  const displayMeta = await sharp(displayBuffer).metadata();
  const thumbMeta = await sharp(thumbnailBuffer).metadata();

  return {
    display: {
      buffer: displayBuffer,
      width: displayMeta.width ?? 0,
      height: displayMeta.height ?? 0,
      mime: 'image/webp',
    },
    thumbnail: {
      buffer: thumbnailBuffer,
      width: thumbMeta.width ?? 0,
      height: thumbMeta.height ?? 0,
      mime: 'image/webp',
    },
    original: {
      format: sniffed,
      width: metadata.width,
      height: metadata.height,
      bytes: input.length,
    },
  };
}
