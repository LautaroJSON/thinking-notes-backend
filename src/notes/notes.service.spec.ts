import { BadRequestException } from '@nestjs/common';
import { NotesService } from './notes.service';
import type { PrismaService } from '../prisma/prisma.service';

const USER = '11111111-1111-4111-8111-111111111111';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const createPrismaMock = () => {
  const tx = {
    note: {
      count: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    note: {
      aggregate: jest.fn(),
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: unknown }) => data),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, tx };
};

describe('NotesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>['prisma'];
  let tx: ReturnType<typeof createPrismaMock>['tx'];
  let service: NotesService;

  beforeEach(() => {
    ({ prisma, tx } = createPrismaMock());
    service = new NotesService(prisma as unknown as PrismaService);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('reorder', () => {
    it('asigna a cada nota su índice como posición', async () => {
      tx.note.count.mockResolvedValue(3);

      await expect(service.reorder(USER, [C, A, B])).resolves.toEqual({
        ids: [C, A, B],
      });

      expect(tx.note.updateMany).toHaveBeenCalledWith({
        where: { userId: USER, id: { notIn: [C, A, B] } },
        data: { position: { increment: 3 } },
      });
      expect(
        tx.note.update.mock.calls.map((call: unknown[]) => call[0]),
      ).toEqual([
        { where: { id: C, userId: USER }, data: { position: 0 } },
        { where: { id: A, userId: USER }, data: { position: 1 } },
        { where: { id: B, userId: USER }, data: { position: 2 } },
      ]);
    });

    it('rechaza ids que no pertenecen al usuario sin modificar nada', async () => {
      tx.note.count.mockResolvedValue(1);

      await expect(service.reorder(USER, [A, B])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(tx.note.updateMany).not.toHaveBeenCalled();
      expect(tx.note.update).not.toHaveBeenCalled();
    });

    it.each([
      ['no es un array', 'x'],
      ['está vacío', []],
      ['tiene ids que no son UUID', ['1']],
      ['tiene ids repetidos', [A, A]],
    ])('rechaza el body si %s', async (_, ids) => {
      await expect(service.reorder(USER, ids)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('pone la nota nueva al final', async () => {
      prisma.note.aggregate.mockResolvedValue({ _max: { position: 4 } });

      await service.create(USER, 'Nueva', []);

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: { userId: USER, title: 'Nueva', contentList: [], position: 5 },
      });
    });

    it('usa la posición 0 si el usuario no tiene notas', async () => {
      prisma.note.aggregate.mockResolvedValue({ _max: { position: null } });

      await service.create(USER, 'Primera', []);

      const [[{ data }]] = prisma.note.create.mock.calls as [
        [{ data: { position: number } }],
      ];
      expect(data.position).toBe(0);
    });
  });

  describe('getAllByUserId', () => {
    it('ordena por posición y desempata por fecha de creación', async () => {
      await service.getAllByUserId(USER);

      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER },
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        }),
      );
    });
  });
});
