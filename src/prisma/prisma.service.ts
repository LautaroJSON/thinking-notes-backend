import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 1. Configuramos el Pool de pg (node-postgres)
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // 2. Creamos el adaptador de Prisma para PostgreSQL
    const adapter = new PrismaPg(pool);

    // 3. Pasamos el adaptador al constructor de PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    // Con el adaptador, la conexión se gestiona a través del pool de pg
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
