import { BadRequestException } from '@nestjs/common';

// Pensamientos de una nota (`contentList`). Cada uno tiene un id, un tipo y un
// valor; los pensamientos de imagen guardan referencias a archivos de Supabase
// Storage, nunca el binario. Los tipos desconocidos (de versiones futuras) se
// aceptan y se guardan sin modificarlos.

export const MAX_IMAGES_PER_THINKING = 5;

export interface TextThinking {
  id: string;
  type: 'text';
  value: string;
}

export interface ImageThinking {
  id: string;
  type: 'image';
  value: string[];
  text?: string;
}

export interface UnknownThinking {
  id: string;
  type: string;
  [key: string]: unknown;
}

export type Thinking = TextThinking | ImageThinking | UnknownThinking;

export const CONTENT_LIST_ERRORS = {
  notAList: 'contentList debe ser una lista de pensamientos',
  id: 'Cada pensamiento necesita un id único',
  type: 'Cada pensamiento necesita un tipo',
  text: 'Pensamiento de texto inválido',
  imageCount: 'Un pensamiento puede tener entre 1 y 5 imágenes',
  imageRef: 'Referencia de imagen inválida',
  image: 'Pensamiento de imagen inválido',
  imageOnCreate: 'Una nota nueva no puede incluir imágenes',
} as const;

const UUID =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ruta válida de una imagen: `<userId>/<noteId>/<uuid>.(webp|jpg|png)`. */
const imageRefPattern = (userId: string, noteId: string) =>
  new RegExp(
    `^${escapeRegExp(userId)}/${escapeRegExp(noteId)}/${UUID}\\.(webp|jpg|png)$`,
  );

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0;

const fail = (message: string): never => {
  throw new BadRequestException(message);
};

/**
 * Valida el `contentList` recibido en un request. La app no tiene un
 * ValidationPipe global, así que la validación se hace acá (como en reorder).
 * - `noteId`: id de la nota (en updates); las imágenes deben estar en su carpeta.
 * - `isCreate`: en una nota nueva no puede haber imágenes (no tiene carpeta aún).
 */
export const parseContentList = (
  input: unknown,
  ctx: { userId: string; noteId?: string; isCreate?: boolean },
): Thinking[] => {
  if (!Array.isArray(input)) fail(CONTENT_LIST_ERRORS.notAList);
  const items = input as unknown[];
  const seenIds = new Set<string>();

  return items.map((item): Thinking => {
    if (!isRecord(item)) return fail(CONTENT_LIST_ERRORS.notAList);
    const { id, type } = item;
    if (!isNonEmptyString(id) || seenIds.has(id)) {
      return fail(CONTENT_LIST_ERRORS.id);
    }
    seenIds.add(id);
    if (!isNonEmptyString(type)) return fail(CONTENT_LIST_ERRORS.type);

    if (type === 'text') {
      if (typeof item.value !== 'string' || 'text' in item) {
        return fail(CONTENT_LIST_ERRORS.text);
      }
      return { id, type, value: item.value };
    }

    if (type === 'image') {
      if (ctx.isCreate || !ctx.noteId) {
        return fail(CONTENT_LIST_ERRORS.imageOnCreate);
      }
      const { value, text } = item;
      if (
        !Array.isArray(value) ||
        value.length < 1 ||
        value.length > MAX_IMAGES_PER_THINKING ||
        new Set(value).size !== value.length
      ) {
        return fail(CONTENT_LIST_ERRORS.imageCount);
      }
      const pattern = imageRefPattern(ctx.userId, ctx.noteId);
      if (!value.every((ref) => typeof ref === 'string' && pattern.test(ref))) {
        return fail(CONTENT_LIST_ERRORS.imageRef);
      }
      if (text !== undefined && typeof text !== 'string') {
        return fail(CONTENT_LIST_ERRORS.image);
      }
      return {
        id,
        type,
        value: value as string[],
        ...(typeof text === 'string' ? { text } : {}),
      };
    }

    // Tipo desconocido: se conserva tal cual
    return { ...item, id, type };
  });
};
