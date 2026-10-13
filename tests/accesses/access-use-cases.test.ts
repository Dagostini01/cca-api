import { describe, expect, it } from 'vitest';
import { createAccessServices } from '../../src/modules/accesses/application/factories/access-services-factory.js';
import { AccessCompanyMismatchError, AccessConflictError, AccessUserNotFoundError } from '../../src/modules/accesses/domain/access-errors.js';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createProfileServices } from '../../src/modules/profiles/application/factories/profile-services-factory.js';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { createUserServices } from '../../src/modules/users/application/factories/user-services-factory.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';
import { InMemoryAccessRepository } from './in-memory-access-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('access use cases', () => {
  function services() {
    const companies = new InMemoryCompanyRepository();
    const users = new InMemoryUserRepository();
    const profiles = new InMemoryProfileRepository();
    const systems = new InMemorySystemRepository();
    return {
      companies: createCompanyServices(companies),
      users: createUserServices(users, companies),
      profiles: createProfileServices(profiles, companies),
      systems: createSystemServices(systems, companies),
      accesses: createAccessServices(new InMemoryAccessRepository(), users, profiles, systems),
    };
  }

  it('links a user to a profile on a system of the same company and allows another system', async () => {
    const { companies, users, profiles, systems, accesses } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const user = await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject, empresaId: company.id });
    const supervisor = await profiles.createProfile.execute({ nome: 'Supervisor', empresaId: company.id });
    const viewer = await profiles.createProfile.execute({ nome: 'Visualizador', empresaId: company.id });
    const escala = await systems.createSystem.execute({ nome: 'Escala', empresaId: company.id });
    const portal = await systems.createSystem.execute({ nome: 'Portal', empresaId: company.id });

    const created = await accesses.createAccess.execute({ usuarioId: user.id, perfilId: supervisor.id, sistemaId: escala.id });
    expect(created).toMatchObject({ usuarioId: user.id, perfilId: supervisor.id, sistemaId: escala.id, status: 'ATIVO' });

    const other = await accesses.createAccess.execute({ usuarioId: user.id, perfilId: viewer.id, sistemaId: portal.id });
    expect(other.sistemaId).toBe(portal.id);

    await expect(accesses.createAccess.execute({
      usuarioId: user.id,
      perfilId: viewer.id,
      sistemaId: escala.id,
    })).rejects.toBeInstanceOf(AccessConflictError);

    const changed = await accesses.updateAccess.execute(created.id, { perfilId: viewer.id, status: 'INATIVO' });
    expect(changed).toMatchObject({ perfilId: viewer.id, sistemaId: escala.id, status: 'INATIVO' });
    expect(await accesses.listAccesses.execute({ usuarioId: user.id })).toHaveLength(2);
  });

  it('rejects a profile from another company and a missing user', async () => {
    const { companies, users, profiles, systems, accesses } = services();
    const alfa = await companies.createCompany.execute({ nome: 'Alfa' });
    const beta = await companies.createCompany.execute({ nome: 'Beta' });
    const user = await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject, empresaId: alfa.id });
    const foreignProfile = await profiles.createProfile.execute({ nome: 'Supervisor', empresaId: beta.id });
    const system = await systems.createSystem.execute({ nome: 'Escala', empresaId: alfa.id });

    await expect(accesses.createAccess.execute({
      usuarioId: user.id,
      perfilId: foreignProfile.id,
      sistemaId: system.id,
    })).rejects.toBeInstanceOf(AccessCompanyMismatchError);
    await expect(accesses.createAccess.execute({
      usuarioId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d',
      perfilId: foreignProfile.id,
      sistemaId: system.id,
    })).rejects.toBeInstanceOf(AccessUserNotFoundError);
  });
});
