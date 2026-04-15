import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Note } from '@prisma/client';

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

  updateById(
    userId: string,
    noteId: string,
    title?: string,
    contentList?: string[],
  ): Promise<Note> {
    return this.prisma.note.update({
      where: {
        id: noteId,
        userId,
      },
      data: {
        ...(title !== undefined && { title }),
        ...(contentList !== undefined && { contentList }),
      },
    });
  }

  deleteById(userId: string, noteId: string): Promise<{ id: string }> {
    return this.prisma.note
      .delete({
        where: {
          id: noteId,
          userId,
        },
      })
      .then(() => ({ id: noteId })); // Retorna solo el ID después de eliminar
  }
}
