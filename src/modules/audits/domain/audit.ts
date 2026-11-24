import { InvalidAuditDescriptionError } from './audit-errors.js';

export const AUDIT_DESCRIPTION_MAX_LENGTH = 128;
export const AUDIT_ACTIONS = ['CRIAR', 'ATUALIZAR', 'EXCLUIR'] as const;
export const AUDIT_RESOURCES = ['EMPRESA', 'SISTEMA', 'MODULO', 'MENU', 'SUBMENU', 'USUARIO', 'ACESSO'] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditResource = (typeof AUDIT_RESOURCES)[number];

export type AuditEntry = {
  id: number;
  criadoEm: Date;
  usuarioId: number | null;
  acao: AuditAction;
  recursoTipo: AuditResource;
  descricao: string;
};

export function normalizeAuditDescription(descricao: string): string {
  const normalized = descricao.trim();
  if (normalized.length === 0 || normalized.length > AUDIT_DESCRIPTION_MAX_LENGTH) throw new InvalidAuditDescriptionError();
  return normalized;
}

export function auditActionIdOf(acao: AuditAction): number {
  if (acao === 'ATUALIZAR') return 2;
  if (acao === 'EXCLUIR') return 3;
  return 1;
}

export function auditActionOf(id: number | null | undefined): AuditAction {
  if (id === 2) return 'ATUALIZAR';
  if (id === 3) return 'EXCLUIR';
  return 'CRIAR';
}

export function auditResourceOf(value: string | null | undefined): AuditResource {
  if (value && (AUDIT_RESOURCES as readonly string[]).includes(value)) return value as AuditResource;
  return 'EMPRESA';
}
