import { IsString, IsArray, IsOptional } from 'class-validator';
import type { Thinking } from '../content-list';

export class CreateNoteDto {
  @IsString()
  title: string;

  // La forma de cada pensamiento se valida en NotesService con
  // parseContentList (no hay ValidationPipe global)
  @IsOptional()
  @IsArray()
  contentList?: Thinking[];
}
