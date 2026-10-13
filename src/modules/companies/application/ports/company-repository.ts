import type { Company, CompanyStatus } from '../../domain/company.js';

export type NewCompany = {
  nome: string;
  cnpj: string | null;
  status: CompanyStatus;
};

export interface CompanyRepository {
  add(company: NewCompany): Promise<Company>;
  list(): Promise<Company[]>;
  findById(id: string): Promise<Company | null>;
  save(company: Company): Promise<Company>;
}
