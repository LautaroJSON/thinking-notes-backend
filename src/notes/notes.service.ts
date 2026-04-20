import {
  BadRequestException,
  HttpExceptionOptions,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Note } from '@prisma/client';
type CustomExceptionOptions = Omit<HttpExceptionOptions, 'code'> & {
  code: string;
};

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    title: string,
    contentList: string[] = [],
  ): Promise<Note> {
    return this.prisma.note.create({
      data: {
        userId,
        title,
        contentList,
      },
    });
  }

  getAllByUserId(
    userId: string,
  ): Promise<Pick<Note, 'id' | 'title' | 'contentList'>[]> {
    return this.prisma.note.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        contentList: true,
      },
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
        },
      });

      return updatedNote;
    } catch (error) {
      throw error;
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
