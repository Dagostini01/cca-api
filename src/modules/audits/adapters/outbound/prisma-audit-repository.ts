import { Prisma, PrismaClient } from '@prisma/client';
import type { AuditListFilter, AuditPageQuery, AuditRepository, NewAuditEntry } from '../../application/ports/audit-repository.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCES, auditActionIdOf, auditActionOf, auditResourceOf, type AuditAction, type AuditEntry, type AuditResource } from '../../domain/audit.js';

function toAudit(row: {
  id: number;
  usuarioId: number | null;
  tipoId: number | null;
  descricao: string | null;
  descricaoCurta: string | null;
  criadoEm: Date;
}): AuditEntry {
  return {
    id: row.id,
    criadoEm: row.criadoEm,
    usuarioId: row.usuarioId,
    acao: auditActionOf(row.tipoId),
    recursoTipo: auditResourceOf(row.descricaoCurta),
    descricao: row.descricao ?? '',
  };
}

const actionLabel: Record<AuditAction, string> = { CRIAR: 'criou', ATUALIZAR: 'atualizou', EXCLUIR: 'excluiu' };
const resourceLabel: Record<AuditResource, string> = {
  EMPRESA: 'empresa',
  SISTEMA: 'sistema',
  MODULO: 'módulo',
  MENU: 'menu',
  SUBMENU: 'submenu',
  USUARIO: 'usuário',
  ACESSO: 'acesso',
};

function wordWhere(word: string): Prisma.AuditoriaWhereInput {
  const needle = word.toLocaleLowerCase('pt-BR');
  const ors: Prisma.AuditoriaWhereInput[] = [
    { descricao: { contains: word } },
    { usuario: { nome: { contains: word } } },
    { usuario: { email: { contains: word } } },
  ];
  if (needle.length >= 3) {
    const actions = AUDIT_ACTIONS.filter((action) => actionLabel[action].includes(needle) || needle.includes(actionLabel[action]) || action.toLowerCase().includes(needle));
    const resources = AUDIT_RESOURCES.filter((resource) => resourceLabel[resource].includes(needle) || needle.includes(resourceLabel[resource]) || resource.toLowerCase().includes(needle));
    if (actions.length > 0) ors.push({ tipoId: { in: actions.map(auditActionIdOf) } });
    if (resources.length > 0) ors.push({ descricaoCurta: { in: [...resources] } });
  }
  const date = word.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (date) {
    const start = new Date(Number(date[3]), Number(date[2]) - 1, Number(date[1]));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    ors.push({ criadoEm: { gte: start, lt: end } });
  }
  return { OR: ors };
}

function whereOf(filter: AuditListFilter = {}): Prisma.AuditoriaWhereInput {
  const words = filter.q?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    usuarioId: filter.usuarioId,
    descricaoCurta: filter.recursoTipo,
    tipoId: filter.acao ? auditActionIdOf(filter.acao) : undefined,
    criadoEm: filter.desde || filter.ate ? { gte: filter.desde, lte: filter.ate } : undefined,
    ...(words.length > 0 ? { AND: words.map(wordWhere) } : {}),
  };
}

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(entry: NewAuditEntry): Promise<AuditEntry> {
    const row = await this.prisma.auditoria.create({
      data: {
        usuarioId: entry.usuarioId,
        tipoId: auditActionIdOf(entry.acao),
        descricao: entry.descricao,
        descricaoCurta: entry.recursoTipo,
      },
    });
    return toAudit(row);
  }

  async list(filter: AuditListFilter = {}): Promise<AuditEntry[]> {
    const rows = await this.prisma.auditoria.findMany({ where: whereOf(filter) });
    return rows.map(toAudit);
  }

  async page(query: AuditPageQuery): Promise<{ rows: AuditEntry[]; total: number }> {
    const where = whereOf(query);
    const skip = (query.pagina - 1) * query.tamanho;
    const [total, rows] = await Promise.all([
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.findMany({
        where,
        orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
        skip,
        take: query.tamanho,
      }),
    ]);
    return { rows: rows.map(toAudit), total };
  }

  async findById(id: number): Promise<AuditEntry | null> {
    const row = await this.prisma.auditoria.findUnique({ where: { id } });
    return row ? toAudit(row) : null;
  }
}

export function createPrismaAuditRepository(prisma: PrismaClient): AuditRepository {
  return new PrismaAuditRepository(prisma);
}
