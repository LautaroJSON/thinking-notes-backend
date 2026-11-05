import {
  BadRequestException,
  HttpExceptionOptions,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Note } from '@prisma/client';
import { isUUID } from 'class-validator';
type CustomExceptionOptions = Omit<HttpExceptionOptions, 'code'> & {
  code: string;
};

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    title: string,
    contentList: string[] = [],
  ): Promise<Note> {
    // La nota nueva va al final de la lista del usuario
    const { _max } = await this.prisma.note.aggregate({
      where: { userId },
      _max: { position: true },
    });
    const position = (_max.position ?? -1) + 1;

    return this.prisma.note.create({
      data: {
        userId,
        title,
        contentList,
        position,
      },
    });
  }

  getAllByUserId(
    userId: string,
  ): Promise<
    Pick<Note, 'id' | 'title' | 'contentList' | 'createdAt' | 'updatedAt'>[]
  > {
    return this.prisma.note.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        contentList: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateById(
    userId: string,
    noteId: string,
    title?: string,
    contentList?: string[],
  ): Promise<Note> {
    try {
      const updatedNote = await this.prisma.note.update({
        where: {
          id: noteId,
          userId,
        },
        data: {
          ...(title !== undefined && { title }),
          ...(contentList !== undefined && { contentList }),
          // Se marca a mano y no con @updatedAt: así reordenar (que también
          // hace update sobre `position`) no cuenta como una modificación.
          updatedAt: new Date(),
        },
      });

      return updatedNote;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reasigna el orden de las notas del usuario: cada id toma como posición su
   * índice en `ids`. Las notas del usuario que no vengan en `ids` (por ejemplo,
   * creadas desde otro dispositivo) quedan después, conservando su orden.
   * Todo ocurre en una transacción: ante un error no cambia nada.
   */
  async reorder(userId: string, ids: unknown): Promise<{ ids: string[] }> {
    // La app no tiene un ValidationPipe global, así que el body se valida acá
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      !ids.every((id) => typeof id === 'string' && isUUID(id)) ||
      new Set(ids).size !== ids.length
    ) {
      throw new BadRequestException(
        'ids debe ser una lista no vacía de UUIDs sin repetir',
      );
    }
    const noteIds = ids as string[];

    try {
      await this.prisma.$transaction(async (tx) => {
        const ownedCount = await tx.note.count({
          where: { userId, id: { in: noteIds } },
        });
        if (ownedCount !== noteIds.length) {
          throw new BadRequestException(
            'Alguna nota no existe o no te pertenece',
          );
        }

        await tx.note.updateMany({
          where: { userId, id: { notIn: noteIds } },
          data: { position: { increment: noteIds.length } },
        });

        for (const [index, id] of noteIds.entries()) {
          await tx.note.update({
            where: { id, userId },
            data: { position: index },
          });
        }
      });

      return { ids: noteIds };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error reordering notes:', error);
      throw new InternalServerErrorException('No se pudo guardar el orden', {
        cause: error,
      });
    }
  }

  async deleteById(userId: string, noteId: string): Promise<{ id: string }> {
    try {
      const deletedNote = await this.prisma.note.delete({
        where: {
          id: noteId,
          userId: userId,
        },
      });

      return { id: deletedNote.id };
    } catch (error) {
      console.error('Error deleting note:', error, error.code, error.message);

      if (error.code === 'P2007' || error.message.includes('uuid')) {
        throw new BadRequestException(
          'El ID de la nota no tiene un formato válido',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('La nota no existe o no tienes permisos');
      }

      throw new InternalServerErrorException('No se pudo borrar la nota', {
        cause: error,
        message: error.message,
        code: error.code,
      } as CustomExceptionOptions);
    }
  }
}
