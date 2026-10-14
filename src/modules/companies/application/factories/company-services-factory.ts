import type { CompanyRepository } from '../ports/company-repository.js';
import { CreateCompany } from '../use-cases/create-company.js';
import { DeleteCompany, type CompanyDeleteBlockers } from '../use-cases/delete-company.js';
import { GetCompany } from '../use-cases/get-company.js';
import { ListCompanies } from '../use-cases/list-companies.js';
import { UpdateCompany } from '../use-cases/update-company.js';

export type CompanyServices = {
  createCompany: CreateCompany;
  listCompanies: ListCompanies;
  getCompany: GetCompany;
  updateCompany: UpdateCompany;
  deleteCompany: DeleteCompany;
};

export function createCompanyServices(companies: CompanyRepository, blockers?: CompanyDeleteBlockers): CompanyServices {
  return {
    createCompany: new CreateCompany(companies),
    listCompanies: new ListCompanies(companies),
    getCompany: new GetCompany(companies),
    updateCompany: new UpdateCompany(companies),
    deleteCompany: new DeleteCompany(companies, blockers),
  };
}
