import { describe, expect, it } from 'vitest';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createUserServices } from '../../src/modules/users/application/factories/user-services-factory.js';
import {
  EmptyUserUpdateError,
  InvalidUserEmailError,
  InvalidUserSubjectError,
  UserCompanyNotFoundError,
  UserEmailConflictError,
  UserNotFoundError,
  UserSubjectConflictError,
} from '../../src/modules/users/domain/user-errors.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryUserRepository } from './in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('user use cases', () => {
  function services() {
    const companies = new InMemoryCompanyRepository();
    return { companies: createCompanyServices(companies), users: createUserServices(new InMemoryUserRepository(), companies) };
  }

  it('creates a user only when the company exists and stores a normalized email', async () => {
    const { companies, users } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const created = await users.createUser.execute({
      nome: '  Ana Costa  ',
      email: 'Ana.Costa@Exemplo.com',
      keycloakSub: subject.toUpperCase(),
      empresaId: company.id,
    });

    expect(created).toMatchObject({
      nome: 'Ana Costa',
      email: 'ana.costa@exemplo.com',
      keycloakSub: subject,
      empresaId: company.id,
      status: 'ATIVO',
    });
    expect(created).not.toHaveProperty('senha');
    await expect(users.createUser.execute({
      nome: 'Outro',
      email: 'outro@exemplo.com',
      keycloakSub: otherSubject,
      empresaId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d',
    })).rejects.toBeInstanceOf(UserCompanyNotFoundError);
  });

  it('rejects a repeated subject or email and a subject that is not a uuid', async () => {
    const { companies, users } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject, empresaId: company.id });

    await expect(users.createUser.execute({
      nome: 'Ana 2',
      email: 'ANA@exemplo.com',
      keycloakSub: otherSubject,
      empresaId: company.id,
    })).rejects.toBeInstanceOf(UserEmailConflictError);
    await expect(users.createUser.execute({
      nome: 'Bruno',
      email: 'bruno@exemplo.com',
      keycloakSub: subject,
      empresaId: company.id,
    })).rejects.toBeInstanceOf(UserSubjectConflictError);
    await expect(users.createUser.execute({
      nome: 'Bruno',
      email: 'bruno@exemplo.com',
      keycloakSub: 'sub-1',
      empresaId: company.id,
    })).rejects.toBeInstanceOf(InvalidUserSubjectError);
    await expect(users.createUser.execute({
      nome: 'Bruno',
      email: 'sem-arroba',
      keycloakSub: otherSubject,
      empresaId: company.id,
    })).rejects.toBeInstanceOf(InvalidUserEmailError);
  });

  it('finds the local user by the token subject and keeps that subject unchanged', async () => {
    const { companies, users } = services();
    const alfa = await companies.createCompany.execute({ nome: 'Alfa' });
    const beta = await companies.createCompany.execute({ nome: 'Beta' });
    const created = await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject, empresaId: alfa.id });
    await users.createUser.execute({ nome: 'Bruno', email: 'bruno@exemplo.com', keycloakSub: otherSubject, empresaId: alfa.id });

    const mine = await users.getUserBySubject.execute(subject);
    expect(mine.id).toBe(created.id);
    await expect(users.getUserBySubject.execute('cccccccc-dddd-4eee-8fff-000000000000')).rejects.toBeInstanceOf(UserNotFoundError);

    const updated = await users.updateUser.execute(created.id, { empresaId: beta.id, status: 'INATIVO', nome: 'Ana Lima' });
    expect(updated).toMatchObject({ empresaId: beta.id, status: 'INATIVO', nome: 'Ana Lima', keycloakSub: subject });
    expect(await users.listUsers.execute({ empresaId: alfa.id })).toEqual([expect.objectContaining({ nome: 'Bruno' })]);
    await expect(users.updateUser.execute(created.id, {})).rejects.toBeInstanceOf(EmptyUserUpdateError);
  });
});
