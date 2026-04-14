import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  providers: [PrismaService],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    NotesModule,
  ],
})
export class AppModule {}
