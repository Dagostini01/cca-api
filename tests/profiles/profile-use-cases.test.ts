import { describe, expect, it } from 'vitest';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createProfileServices } from '../../src/modules/profiles/application/factories/profile-services-factory.js';
import { EmptyProfileUpdateError, ProfileCompanyNotFoundError, ProfileNameConflictError, ProfileNotFoundError } from '../../src/modules/profiles/domain/profile-errors.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryProfileRepository } from './in-memory-profile-repository.js';

describe('profile use cases', () => {
  function services() {
    const companies = new InMemoryCompanyRepository();
    return { companies: createCompanyServices(companies), profiles: createProfileServices(new InMemoryProfileRepository(), companies) };
  }

  it('creates a profile only when the company exists and stores a trimmed description', async () => {
    const { companies, profiles } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const created = await profiles.createProfile.execute({
      nome: '  Supervisor  ',
      descricao: '  Gestão operacional  ',
      empresaId: company.id,
    });

    expect(created).toMatchObject({ nome: 'Supervisor', descricao: 'Gestão operacional', empresaId: company.id, status: 'ATIVO' });
    expect(created).not.toHaveProperty('permissoes');
    await expect(profiles.createProfile.execute({
      nome: 'Operador',
      empresaId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d',
    })).rejects.toBeInstanceOf(ProfileCompanyNotFoundError);
  });

  it('keeps the same name available in another company and rejects it inside the same one', async () => {
    const { companies, profiles } = services();
    const alfa = await companies.createCompany.execute({ nome: 'Alfa' });
    const beta = await companies.createCompany.execute({ nome: 'Beta' });
    await profiles.createProfile.execute({ nome: 'Supervisor', empresaId: alfa.id });
    const other = await profiles.createProfile.execute({ nome: 'supervisor', empresaId: beta.id });
    expect(other.empresaId).toBe(beta.id);
    expect(other.descricao).toBeNull();

    await expect(profiles.createProfile.execute({ nome: 'SUPERVISOR', empresaId: alfa.id })).rejects.toBeInstanceOf(ProfileNameConflictError);
    const listed = await profiles.listProfiles.execute({ empresaId: alfa.id });
    expect(listed.map((profile) => profile.nome)).toEqual(['Supervisor']);
  });

  it('moves a profile, clears the description and can inactivate it', async () => {
    const { companies, profiles } = services();
    const alfa = await companies.createCompany.execute({ nome: 'Alfa' });
    const beta = await companies.createCompany.execute({ nome: 'Beta' });
    const created = await profiles.createProfile.execute({ nome: 'Supervisor', descricao: 'Gestão', empresaId: alfa.id });

    const moved = await profiles.updateProfile.execute(created.id, { empresaId: beta.id, descricao: null, status: 'INATIVO' });
    expect(moved).toMatchObject({ empresaId: beta.id, nome: 'Supervisor', descricao: null, status: 'INATIVO' });
    expect(await profiles.listProfiles.execute({ empresaId: alfa.id })).toEqual([]);
    await expect(profiles.updateProfile.execute(created.id, {})).rejects.toBeInstanceOf(EmptyProfileUpdateError);
    await expect(profiles.getProfile.execute('5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d')).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});
