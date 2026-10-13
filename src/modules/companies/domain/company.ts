import { isValidCnpj } from './cnpj.js';
import { InvalidCompanyDocumentError, InvalidCompanyNameError } from './company-errors.js';

export const COMPANY_NAME_MAX_LENGTH = 128;

export type CompanyStatus = 'ATIVO' | 'INATIVO';

export type Company = {
  id: string;
  nome: string;
  cnpj: string | null;
  status: CompanyStatus;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function normalizeCompanyName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > COMPANY_NAME_MAX_LENGTH) throw new InvalidCompanyNameError();
  return normalized;
}

export function normalizeCnpj(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new InvalidCompanyDocumentError();
  const digits = trimmed.replace(/\D/g, '');
  if (!isValidCnpj(digits)) throw new InvalidCompanyDocumentError();
  return digits;
}
