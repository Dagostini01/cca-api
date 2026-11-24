import type { Company, CompanyStatus } from '../../domain/company.js';

export type NewCompany = {
  razaoSocial: string;
  nomeFantasia: string | null;
  nomeReduzido: string | null;
  cnpj: string | null;
  dataConstituicao: Date | null;
  status: CompanyStatus;
};

export type CompanyListFilter = {
  q?: string;
};

export type CompanyPageQuery = CompanyListFilter & {
  pagina: number;
  tamanho: number;
};

export interface CompanyRepository {
  add(company: NewCompany): Promise<Company>;
  list(filter?: CompanyListFilter): Promise<Company[]>;
  page(query: CompanyPageQuery): Promise<{ rows: Company[]; total: number }>;
  findById(id: number): Promise<Company | null>;
  save(company: Company): Promise<Company>;
  remove(id: number): Promise<void>;
}
