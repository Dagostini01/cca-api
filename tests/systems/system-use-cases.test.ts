import { describe, expect, it } from 'vitest';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { SystemCompanyNotFoundError, SystemNameConflictError, SystemNotFoundError } from '../../src/modules/systems/domain/system-errors.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemorySystemRepository } from './in-memory-system-repository.js';

describe('system use cases', () => {
  function services() {
    const companies = new InMemoryCompanyRepository();
    return { companies: createCompanyServices(companies), systems: createSystemServices(new InMemorySystemRepository(), companies) };
  }

  it('creates a system only when the company exists', async () => {
    const { companies, systems } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const created = await systems.createSystem.execute({ nome: '  Escala  ', empresaId: company.id });

    expect(created).toMatchObject({ nome: 'Escala', empresaId: company.id, status: 'ATIVO' });
    await expect(systems.createSystem.execute({
      nome: 'Outro',
      empresaId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d',
    })).rejects.toBeInstanceOf(SystemCompanyNotFoundError);
  });

  it('keeps the same name available in another company and rejects it inside the same one', async () => {
    const { companies, systems } = services();
    const alfa = await companies.createCompany.execute({ nome: 'Alfa' });
    const beta = await companies.createCompany.execute({ nome: 'Beta' });
    await systems.createSystem.execute({ nome: 'Escala', empresaId: alfa.id });
    const other = await systems.createSystem.execute({ nome: 'escala', empresaId: beta.id });
    expect(other.empresaId).toBe(beta.id);

    await expect(systems.createSystem.execute({ nome: 'ESCALA', empresaId: alfa.id })).rejects.toBeInstanceOf(SystemNameConflictError);
    const listed = await systems.listSystems.execute({ empresaId: alfa.id });
    expect(listed.map((system) => system.nome)).toEqual(['Escala']);
  });

  it('moves a system to another company and can inactivate it', async () => {
    const { companies, systems } = services();
    const alfa = await companies.createCompany.execute({ nome: 'Alfa' });
    const beta = await companies.createCompany.execute({ nome: 'Beta' });
    const created = await systems.createSystem.execute({ nome: 'Escala', empresaId: alfa.id });

    const moved = await systems.updateSystem.execute(created.id, { empresaId: beta.id, status: 'INATIVO' });
    expect(moved).toMatchObject({ empresaId: beta.id, nome: 'Escala', status: 'INATIVO' });
    expect(await systems.listSystems.execute({ empresaId: alfa.id })).toEqual([]);
  });

  it('reports a missing system and refuses a missing destination company', async () => {
    const { companies, systems } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const created = await systems.createSystem.execute({ nome: 'Escala', empresaId: company.id });
    const missingId = '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d';

    await expect(systems.getSystem.execute(missingId)).rejects.toBeInstanceOf(SystemNotFoundError);
    await expect(systems.updateSystem.execute(created.id, { empresaId: missingId })).rejects.toBeInstanceOf(SystemCompanyNotFoundError);
  });
});
