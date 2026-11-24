import { describe, expect, it } from 'vitest';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { CompanyDocumentConflictError, CompanyNotFoundError, EmptyCompanyUpdateError, InvalidCompanyDocumentError } from '../../src/modules/companies/domain/company-errors.js';
import { InMemoryCompanyRepository } from './in-memory-company-repository.js';

describe('company use cases', () => {
  function services() {
    return createCompanyServices(new InMemoryCompanyRepository());
  }

  it('creates a company with the default status and a normalized document', async () => {
    const { createCompany, getCompany } = services();
    const created = await createCompany.execute({ razaoSocial: '  Alfa  ', cnpj: '11.222.333/0001-81' });

    expect(created.razaoSocial).toBe('Alfa');
    expect(created.cnpj).toBe('11222333000181');
    expect(created.status).toBe('ATIVADO');
    expect(await getCompany.execute(created.id)).toMatchObject({ id: created.id, razaoSocial: 'Alfa' });
  });

  it('allows a company without a document and rejects an invalid one', async () => {
    const { createCompany } = services();
    const created = await createCompany.execute({ razaoSocial: 'Sem documento', status: 'DESATIVADO' });
    expect(created.cnpj).toBeNull();
    expect(created.status).toBe('DESATIVADO');
    await expect(createCompany.execute({ razaoSocial: 'Invalida', cnpj: '11222333000180' })).rejects.toBeInstanceOf(InvalidCompanyDocumentError);
  });

  it('rejects a duplicated document and lists companies by name', async () => {
    const { createCompany, listCompanies } = services();
    await createCompany.execute({ razaoSocial: 'Beta', cnpj: '11.222.333/0001-81' });
    await createCompany.execute({ razaoSocial: 'Alfa', cnpj: '04.252.011/0001-10' });
    await expect(createCompany.execute({ razaoSocial: 'Gama', cnpj: '11222333000181' })).rejects.toBeInstanceOf(CompanyDocumentConflictError);

    const companies = await listCompanies.execute();
    expect(companies.map((company) => company.razaoSocial)).toEqual(['Alfa', 'Beta']);
  });

  it('updates only the provided fields and can clear the document', async () => {
    const { createCompany, updateCompany } = services();
    const created = await createCompany.execute({ razaoSocial: 'Alfa', cnpj: '11.222.333/0001-81' });
    const renamed = await updateCompany.execute(created.id, { razaoSocial: 'Alfa Atual' });
    expect(renamed.cnpj).toBe('11222333000181');
    expect(renamed.razaoSocial).toBe('Alfa Atual');

    const cleared = await updateCompany.execute(created.id, { cnpj: null, status: 'DESATIVADO' });
    expect(cleared.cnpj).toBeNull();
    expect(cleared.status).toBe('DESATIVADO');
  });

  it('reports a missing company and an empty update', async () => {
    const { getCompany, updateCompany } = services();
    await expect(getCompany.execute(999)).rejects.toBeInstanceOf(CompanyNotFoundError);
    await expect(updateCompany.execute(999, { razaoSocial: 'Alfa' })).rejects.toBeInstanceOf(CompanyNotFoundError);
    await expect(updateCompany.execute(999, {})).rejects.toBeInstanceOf(EmptyCompanyUpdateError);
  });
});
