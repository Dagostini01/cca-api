import { PrismaClient } from '@prisma/client';

export function createPrismaClient(databaseUrl: string): PrismaClient {
  if (databaseUrl.trim().length === 0) throw new Error('DATABASE_URL is required');
  return new PrismaClient({ datasourceUrl: databaseUrl });
}
