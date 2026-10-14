import { PrismaClient } from '@prisma/client';
import type { AuditListFilter, AuditRepository, NewAuditEntry } from '../../application/ports/audit-repository.js';
import type { AuditEntry } from '../../domain/audit.js';

function toAudit(row: {
  id: string;
  ocorridoEm: Date;
  usuarioId: string | null;
  usuarioNome: string | null;
  acao: AuditEntry['acao'];
  recursoTipo: AuditEntry['recursoTipo'];
  recursoId: string;
  descricao: string;
  empresaId: string;
}): AuditEntry {
  return {
    id: row.id,
    ocorridoEm: row.ocorridoEm,
    usuarioId: row.usuarioId,
    usuarioNome: row.usuarioNome,
    acao: row.acao,
    recursoTipo: row.recursoTipo,
    recursoId: row.recursoId,
    descricao: row.descricao,
    empresaId: row.empresaId,
  };
}

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(entry: NewAuditEntry): Promise<AuditEntry> {
    const row = await this.prisma.auditoria.create({ data: entry });
    return toAudit(row);
  }

  async list(filter: AuditListFilter = {}): Promise<AuditEntry[]> {
    const rows = await this.prisma.auditoria.findMany({
      where: {
        empresaId: filter.empresaId,
        usuarioId: filter.usuarioId,
        recursoTipo: filter.recursoTipo,
        ocorridoEm: filter.desde || filter.ate ? { gte: filter.desde, lte: filter.ate } : undefined,
      },
    });
    return rows.map(toAudit);
  }

  async findById(id: string): Promise<AuditEntry | null> {
    const row = await this.prisma.auditoria.findUnique({ where: { id } });
    return row ? toAudit(row) : null;
  }
}

export function createPrismaAuditRepository(prisma: PrismaClient): AuditRepository {
  return new PrismaAuditRepository(prisma);
}
