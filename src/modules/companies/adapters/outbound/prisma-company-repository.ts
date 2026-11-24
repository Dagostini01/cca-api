import { Prisma, PrismaClient } from '@prisma/client';
import { statusIdOf, statusOf } from '../../../../shared/catalog/status.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { CompanyListFilter, CompanyPageQuery, CompanyRepository, NewCompany } from '../../application/ports/company-repository.js';
import type { Company } from '../../domain/company.js';
import { CompanyDocumentConflictError, CompanyNotFoundError } from '../../domain/company-errors.js';

function toCompany(row: {
  id: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  nomeReduzido: string | null;
  cnpj: string | null;
  dataConstituicao: Date | null;
  statusId: number | null;
  criadoEm: Date;
}): Company {
  return {
    id: row.id,
    razaoSocial: row.razaoSocial,
    nomeFantasia: row.nomeFantasia,
    nomeReduzido: row.nomeReduzido,
    cnpj: row.cnpj,
    dataConstituicao: row.dataConstituicao,
    status: statusOf(row.statusId),
    criadoEm: row.criadoEm,
  };
}

function whereOf(filter: CompanyListFilter = {}): Prisma.EmpresaWhereInput {
  const q = filter.q?.trim();
  const digits = q?.replace(/\D/g, '') ?? '';
  if (!q) return {};
  return {
    OR: [
      { razaoSocial: { contains: q } },
      { nomeFantasia: { contains: q } },
      { nomeReduzido: { contains: q } },
      ...(digits ? [{ cnpj: { contains: digits } }] : []),
      { sistemas: { some: { sistema: { nome: { contains: q } } } } },
    ],
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new CompanyDocumentConflictError();
    if (error.code === 'P2025') throw new CompanyNotFoundError();
  }
  throw error;
}

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(company: NewCompany): Promise<Company> {
    try {
      const row = await this.prisma.empresa.create({
        data: {
          razaoSocial: company.razaoSocial,
          nomeFantasia: company.nomeFantasia,
          nomeReduzido: company.nomeReduzido,
          cnpj: company.cnpj,
          dataConstituicao: company.dataConstituicao,
          statusId: statusIdOf(company.status),
        },
      });
      return toCompany(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(filter: CompanyListFilter = {}): Promise<Company[]> {
    const rows = await this.prisma.empresa.findMany({ where: whereOf(filter) });
    return rows.map(toCompany);
  }

  async page(query: CompanyPageQuery): Promise<{ rows: Company[]; total: number }> {
    const where = whereOf(query);
    const skip = (query.pagina - 1) * query.tamanho;
    const [total, rows] = await Promise.all([
      this.prisma.empresa.count({ where }),
      this.prisma.empresa.findMany({
        where,
        orderBy: [{ razaoSocial: 'asc' }, { id: 'asc' }],
        skip,
        take: query.tamanho,
      }),
    ]);
    return { rows: rows.map(toCompany), total };
  }

  async findById(id: number): Promise<Company | null> {
    const row = await this.prisma.empresa.findUnique({ where: { id } });
    return row ? toCompany(row) : null;
  }

  async save(company: Company): Promise<Company> {
    try {
      const row = await this.prisma.empresa.update({
        where: { id: company.id },
        data: {
          razaoSocial: company.razaoSocial,
          nomeFantasia: company.nomeFantasia,
          nomeReduzido: company.nomeReduzido,
          cnpj: company.cnpj,
          dataConstituicao: company.dataConstituicao,
          statusId: statusIdOf(company.status),
        },
      });
      return toCompany(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const [accesses, addresses, contacts] = await Promise.all([
          tx.acesso.count({ where: { empresaId: id } }),
          tx.empresaEndereco.count({ where: { empresaId: id } }),
          tx.tipoContato.count({ where: { empresaId: id } }),
        ]);
        if (accesses + addresses + contacts > 0) throw new DeleteRestrictedError();
        await tx.empresa.delete({ where: { id } });
      });
    } catch (error) {
      if (error instanceof DeleteRestrictedError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new DeleteRestrictedError();
      mapPersistenceError(error);
    }
  }
}

export function createPrismaCompanyRepository(prisma: PrismaClient): CompanyRepository {
  return new PrismaCompanyRepository(prisma);
}
