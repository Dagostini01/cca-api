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
    const created = await createCompany.execute({ nome: '  Alfa  ', cnpj: '11.222.333/0001-81' });

    expect(created.nome).toBe('Alfa');
    expect(created.cnpj).toBe('11222333000181');
    expect(created.status).toBe('ATIVO');
    expect(await getCompany.execute(created.id)).toMatchObject({ id: created.id, nome: 'Alfa' });
  });

  it('allows a company without a document and rejects an invalid one', async () => {
    const { createCompany } = services();
    const created = await createCompany.execute({ nome: 'Sem documento', status: 'INATIVO' });
    expect(created.cnpj).toBeNull();
    expect(created.status).toBe('INATIVO');
    await expect(createCompany.execute({ nome: 'Invalida', cnpj: '11222333000180' })).rejects.toBeInstanceOf(InvalidCompanyDocumentError);
  });

  it('rejects a duplicated document and lists companies by name', async () => {
    const { createCompany, listCompanies } = services();
    await createCompany.execute({ nome: 'Beta', cnpj: '11.222.333/0001-81' });
    await createCompany.execute({ nome: 'Alfa', cnpj: '04.252.011/0001-10' });
    await expect(createCompany.execute({ nome: 'Gama', cnpj: '11222333000181' })).rejects.toBeInstanceOf(CompanyDocumentConflictError);

    const companies = await listCompanies.execute();
    expect(companies.map((company) => company.nome)).toEqual(['Alfa', 'Beta']);
  });

  it('updates only the provided fields and can clear the document', async () => {
    const { createCompany, updateCompany } = services();
    const created = await createCompany.execute({ nome: 'Alfa', cnpj: '11.222.333/0001-81' });
    const renamed = await updateCompany.execute(created.id, { nome: 'Alfa Atual' });
    expect(renamed.cnpj).toBe('11222333000181');
    expect(renamed.nome).toBe('Alfa Atual');

    const cleared = await updateCompany.execute(created.id, { cnpj: null, status: 'INATIVO' });
    expect(cleared.cnpj).toBeNull();
    expect(cleared.status).toBe('INATIVO');
    expect(cleared.atualizadoEm.getTime()).toBeGreaterThanOrEqual(created.atualizadoEm.getTime());
  });

  it('reports a missing company and an empty update', async () => {
    const { getCompany, updateCompany } = services();
    const missingId = '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d';
    await expect(getCompany.execute(missingId)).rejects.toBeInstanceOf(CompanyNotFoundError);
    await expect(updateCompany.execute(missingId, { nome: 'Alfa' })).rejects.toBeInstanceOf(CompanyNotFoundError);
    await expect(updateCompany.execute(missingId, {})).rejects.toBeInstanceOf(EmptyCompanyUpdateError);
  });
});
