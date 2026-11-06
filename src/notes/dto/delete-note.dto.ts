import type { Thinking } from '../content-list';

export class DeleteNoteDto {
  title: string;
  contentList?: Thinking[];
}
