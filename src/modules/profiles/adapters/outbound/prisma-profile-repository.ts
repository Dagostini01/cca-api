import { Prisma, PrismaClient } from '@prisma/client';
import type { NewProfile, ProfileRepository } from '../../application/ports/profile-repository.js';
import type { Profile } from '../../domain/profile.js';
import { ProfileCompanyNotFoundError, ProfileNameConflictError, ProfileNotFoundError } from '../../domain/profile-errors.js';

function toProfile(row: {
  id: string;
  empresaId: string;
  nome: string;
  descricao: string | null;
  status: Profile['status'];
  criadoEm: Date;
  atualizadoEm: Date;
}): Profile {
  return {
    id: row.id,
    empresaId: row.empresaId,
    nome: row.nome,
    descricao: row.descricao,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new ProfileNameConflictError();
    if (error.code === 'P2003') throw new ProfileCompanyNotFoundError();
    if (error.code === 'P2025') throw new ProfileNotFoundError();
  }
  throw error;
}

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(profile: NewProfile): Promise<Profile> {
    try {
      const row = await this.prisma.perfil.create({ data: profile });
      return toProfile(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(empresaId?: string): Promise<Profile[]> {
    const rows = await this.prisma.perfil.findMany({ where: empresaId ? { empresaId } : undefined });
    return rows.map(toProfile);
  }

  async findById(id: string): Promise<Profile | null> {
    const row = await this.prisma.perfil.findUnique({ where: { id } });
    return row ? toProfile(row) : null;
  }

  async save(profile: Profile): Promise<Profile> {
    try {
      const row = await this.prisma.perfil.update({
        where: { id: profile.id },
        data: { empresaId: profile.empresaId, nome: profile.nome, descricao: profile.descricao, status: profile.status },
      });
      return toProfile(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaProfileRepository(prisma: PrismaClient): ProfileRepository {
  return new PrismaProfileRepository(prisma);
}
