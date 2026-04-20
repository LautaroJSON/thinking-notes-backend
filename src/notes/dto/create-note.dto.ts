import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentList?: string[];
}
