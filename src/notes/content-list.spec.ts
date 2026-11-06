import { BadRequestException } from '@nestjs/common';
import { CONTENT_LIST_ERRORS, parseContentList } from './content-list';

const USER = '11111111-1111-4111-8111-111111111111';
const NOTE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FILE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ref = (ext = 'webp', user = USER, note = NOTE) =>
  `${user}/${note}/${FILE}.${ext}`;

const ctx = { userId: USER, noteId: NOTE };

const expectError = (input: unknown, message: string, context = ctx) => {
  let error: unknown;
  try {
    parseContentList(input, context);
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(BadRequestException);
  expect((error as BadRequestException).message).toBe(message);
};

describe('parseContentList', () => {
  it('acepta pensamientos de texto, de imagen y tipos desconocidos', () => {
    const input = [
      { id: 't1', type: 'text', value: 'hola' },
      {
        id: 'i1',
        type: 'image',
        value: [ref(), ref('png').replace(FILE, NOTE)],
      },
      { id: 'i2', type: 'image', value: [ref('jpg')], text: 'pie' },
      { id: 'a1', type: 'audio', value: 'algo', extra: 1 },
    ];

    expect(parseContentList(input, ctx)).toEqual(input);
  });

  it('acepta una lista vacía', () => {
    expect(parseContentList([], ctx)).toEqual([]);
  });

  it('rechaza lo que no es una lista de objetos (incluido el formato anterior)', () => {
    expectError('hola', CONTENT_LIST_ERRORS.notAList);
    expectError(undefined, CONTENT_LIST_ERRORS.notAList);
    expectError(['texto viejo'], CONTENT_LIST_ERRORS.notAList);
    expectError([null], CONTENT_LIST_ERRORS.notAList);
  });

  it('exige ids no vacíos y únicos', () => {
    expectError([{ type: 'text', value: 'a' }], CONTENT_LIST_ERRORS.id);
    expectError([{ id: '', type: 'text', value: 'a' }], CONTENT_LIST_ERRORS.id);
    expectError(
      [
        { id: 'x', type: 'text', value: 'a' },
        { id: 'x', type: 'text', value: 'b' },
      ],
      CONTENT_LIST_ERRORS.id,
    );
  });

  it('exige un tipo', () => {
    expectError([{ id: 'x', value: 'a' }], CONTENT_LIST_ERRORS.type);
  });

  it('valida los pensamientos de texto', () => {
    expectError(
      [{ id: 'x', type: 'text', value: 3 }],
      CONTENT_LIST_ERRORS.text,
    );
    expectError(
      [{ id: 'x', type: 'text', value: 'a', text: 'b' }],
      CONTENT_LIST_ERRORS.text,
    );
  });

  it('exige entre 1 y 5 imágenes sin repetir', () => {
    expectError(
      [{ id: 'x', type: 'image', value: [] }],
      CONTENT_LIST_ERRORS.imageCount,
    );
    expectError(
      [{ id: 'x', type: 'image', value: ref() }],
      CONTENT_LIST_ERRORS.imageCount,
    );
    expectError(
      [{ id: 'x', type: 'image', value: [ref(), ref()] }],
      CONTENT_LIST_ERRORS.imageCount,
    );
    const six = Array.from({ length: 6 }, (_, i) =>
      ref().replace(FILE.slice(0, 1), String(i)),
    );
    expectError(
      [{ id: 'x', type: 'image', value: six }],
      CONTENT_LIST_ERRORS.imageCount,
    );
  });

  it('rechaza referencias de otro usuario, de otra nota o con formato inválido', () => {
    for (const bad of [
      ref('webp', OTHER),
      ref('webp', USER, OTHER),
      ref('gif'),
      `${USER}/${NOTE}/no-es-uuid.webp`,
      `../${USER}/${NOTE}/${FILE}.webp`,
      `local:${FILE}`,
    ]) {
      expectError(
        [{ id: 'x', type: 'image', value: [bad] }],
        CONTENT_LIST_ERRORS.imageRef,
      );
    }
  });

  it('valida el texto que acompaña a las imágenes', () => {
    expectError(
      [{ id: 'x', type: 'image', value: [ref()], text: 5 }],
      CONTENT_LIST_ERRORS.image,
    );
  });

  it('no acepta imágenes al crear una nota', () => {
    expectError(
      [{ id: 'x', type: 'image', value: [ref()] }],
      CONTENT_LIST_ERRORS.imageOnCreate,
      { userId: USER, isCreate: true } as typeof ctx,
    );
    expect(
      parseContentList([{ id: 't', type: 'text', value: 'a' }], {
        userId: USER,
        isCreate: true,
      }),
    ).toEqual([{ id: 't', type: 'text', value: 'a' }]);
  });
});
