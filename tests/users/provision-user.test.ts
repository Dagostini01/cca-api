import { describe, expect, it } from 'vitest';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import type { DirectoryProfile, IdentityDirectory } from '../../src/modules/users/application/ports/identity-directory.js';
import { createUserServices } from '../../src/modules/users/application/factories/user-services-factory.js';
import {
  IdentityEmailConflictError,
  IdentitySubjectNotFoundError,
  InvalidUserSubjectError,
  UserEmailConflictError,
} from '../../src/modules/users/domain/user-errors.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryUserRepository } from './in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const createdId = 'cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa';
const secondId = 'dddddddd-eeee-4fff-8aaa-bbbbbbbbbbbb';

describe('user provisioning', () => {
  function services(directory?: IdentityDirectory) {
    const companies = new InMemoryCompanyRepository();
    return {
      companies: createCompanyServices(companies),
      users: createUserServices(new InMemoryUserRepository(), companies, directory),
    };
  }

  it('rejects a create without subject when no directory is configured', async () => {
    const { companies, users } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    await expect(users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      empresaId: company.id,
    })).rejects.toBeInstanceOf(InvalidUserSubjectError);
  });

  it('stores the id returned by the directory and does not accept a password', async () => {
    const provisioned: DirectoryProfile[] = [];
    const { companies, users } = services({
      async provision(profile) {
        provisioned.push(profile);
        return { id: createdId.toUpperCase() };
      },
      async assertExists() {},
      async sync() {},
      async remove() {},
    });
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const created = await users.createUser.execute({
      nome: 'Ana',
      email: 'Ana@Exemplo.com',
      empresaId: company.id,
    });

    expect(created.keycloakSub).toBe(createdId);
    expect(provisioned).toEqual([{ nome: 'Ana', email: 'ana@exemplo.com', enabled: true }]);
    expect(provisioned[0]).not.toHaveProperty('password');
  });

  it('links an existing subject without creating another directory user', async () => {
    const calls: string[] = [];
    const { companies, users } = services({
      async provision() {
        calls.push('provision');
        return { id: createdId };
      },
      async assertExists(id) {
        calls.push(`exists:${id}`);
      },
      async sync() {},
      async remove() {},
    });
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const created = await users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      keycloakSub: subject,
      empresaId: company.id,
    });

    expect(created.keycloakSub).toBe(subject);
    expect(calls).toEqual([`exists:${subject}`]);
  });

  it('removes a directory user created in this request when the local insert conflicts', async () => {
    const removed: string[] = [];
    const ids = [createdId, secondId];
    const { companies, users } = services({
      async provision() {
        const id = ids.shift();
        if (!id) throw new Error('missing id');
        return { id };
      },
      async assertExists() {},
      async sync() {},
      async remove(id) {
        removed.push(id);
      },
    });
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com', empresaId: company.id });
    await expect(users.createUser.execute({
      nome: 'Ana 2',
      email: 'ana@exemplo.com',
      empresaId: company.id,
    })).rejects.toBeInstanceOf(UserEmailConflictError);
    expect(removed).toEqual([secondId]);
  });

  it('maps a missing subject and a directory email conflict', async () => {
    const { companies, users } = services({
      async provision() {
        throw new IdentityEmailConflictError();
      },
      async assertExists() {
        throw new IdentitySubjectNotFoundError();
      },
      async sync() {},
      async remove() {},
    });
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    await expect(users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      keycloakSub: subject,
      empresaId: company.id,
    })).rejects.toBeInstanceOf(IdentitySubjectNotFoundError);
    await expect(users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      empresaId: company.id,
    })).rejects.toBeInstanceOf(IdentityEmailConflictError);
  });

  it('syncs enabled when the local status changes', async () => {
    const synced: boolean[] = [];
    const { companies, users } = services({
      async provision() {
        return { id: createdId };
      },
      async assertExists() {},
      async sync(_id, profile) {
        synced.push(profile.enabled);
      },
      async remove() {},
    });
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const created = await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com', empresaId: company.id });
    const updated = await users.updateUser.execute(created.id, { status: 'INATIVO' });

    expect(updated.status).toBe('INATIVO');
    expect(updated.keycloakSub).toBe(createdId);
    expect(synced).toEqual([false]);
  });
});
