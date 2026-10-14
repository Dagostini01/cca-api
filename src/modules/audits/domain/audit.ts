import { InvalidAuditDescriptionError } from './audit-errors.js';

export const AUDIT_DESCRIPTION_MAX_LENGTH = 512;
export const AUDIT_ACTIONS = ['CRIAR', 'ATUALIZAR'] as const;
export const AUDIT_RESOURCES = ['EMPRESA', 'SISTEMA', 'MODULO', 'MENU', 'SUBMENU', 'USUARIO', 'PERFIL', 'PERMISSAO', 'ACESSO'] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditResource = (typeof AUDIT_RESOURCES)[number];

export type AuditEntry = {
  id: string;
  ocorridoEm: Date;
  usuarioId: string | null;
  usuarioNome: string | null;
  acao: AuditAction;
  recursoTipo: AuditResource;
  recursoId: string;
  descricao: string;
  empresaId: string;
};

export function normalizeAuditDescription(descricao: string): string {
  const normalized = descricao.trim();
  if (normalized.length === 0 || normalized.length > AUDIT_DESCRIPTION_MAX_LENGTH) throw new InvalidAuditDescriptionError();
  return normalized;
}
