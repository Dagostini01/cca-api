import type { CatalogStatus } from '../../../shared/catalog/status.js';
import { normalizeOptionalText, LONG_TEXT_MAX_LENGTH } from '../../../shared/catalog/text.js';
import { isValidCnpj } from './cnpj.js';
import { InvalidCompanyDocumentError, InvalidCompanyNameError } from './company-errors.js';

export const COMPANY_NAME_MAX_LENGTH = 120;

export type CompanyStatus = CatalogStatus;

export type Company = {
  id: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  nomeReduzido: string | null;
  cnpj: string | null;
  dataConstituicao: Date | null;
  status: CompanyStatus;
  criadoEm: Date;
};

export function normalizeCompanyName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > COMPANY_NAME_MAX_LENGTH) throw new InvalidCompanyNameError();
  return normalized;
}

export function normalizeCompanyAlias(value: string | null | undefined): string | null {
  return normalizeOptionalText(value, LONG_TEXT_MAX_LENGTH);
}

export function normalizeCnpj(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new InvalidCompanyDocumentError();
  const digits = trimmed.replace(/\D/g, '');
  if (!isValidCnpj(digits)) throw new InvalidCompanyDocumentError();
  return digits;
}
