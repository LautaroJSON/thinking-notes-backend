import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { NotesService } from './notes.service';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @UseGuards(SupabaseAuthGuard)
  getAll(
    @Req() request: Request & { user?: { id: string } },
  ) {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User not found in request');
    }

    return this.notesService.getAllByUserId(userId);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(
    @Body() dto: CreateNoteDto,
    @Req() request: Request & { user?: { id: string } },
  ) {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User not found in request');
    }

    return this.notesService.create(
      userId,
      dto.title,
      Array.isArray(dto.contentList) ? dto.contentList : [],
    );
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  update(
    @Param('id') noteId: string,
    @Body() dto: UpdateNoteDto,
    @Req() request: Request & { user?: { id: string } },
  ) {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User not found in request');
    }

    return this.notesService.updateById(
      userId,
      noteId,
      dto.title,
      dto.contentList,
    );
  }
}
