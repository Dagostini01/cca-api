import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { IdentityDirectory } from '../../src/modules/users/application/ports/identity-directory.js';
import { IdentitySubjectNotFoundError } from '../../src/modules/users/domain/user-errors.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const createdId = 'cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa';

describe('HTTP user provisioning', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp(directory: IdentityDirectory) {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: subject }) },
      companyRepository: new InMemoryCompanyRepository(),
      userRepository: new InMemoryUserRepository(),
      identityDirectory: directory,
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('creates a directory user when the body omits keycloakSub and syncs a later status change', async () => {
    const synced: boolean[] = [];
    const app = createApp({
      async provision(profile) {
        expect(profile).not.toHaveProperty('password');
        return { id: createdId };
      },
      async assertExists() {},
      async sync(_id, profile) {
        synced.push(profile.enabled);
      },
      async remove() {},
    });
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const created = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@exemplo.com', empresaId: company.json().id },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ keycloakSub: createdId, email: 'ana@exemplo.com', status: 'ATIVO' });
    expect(created.json()).not.toHaveProperty('password');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/usuarios/${created.json().id}`,
      headers,
      payload: { status: 'INATIVO' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ status: 'INATIVO', keycloakSub: createdId });
    expect(synced).toEqual([false]);
  });

  it('returns not found when the informed subject is absent from the directory', async () => {
    const app = createApp({
      async provision() {
        return { id: createdId };
      },
      async assertExists() {
        throw new IdentitySubjectNotFoundError();
      },
      async sync() {},
      async remove() {},
    });
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const response = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: {
        nome: 'Ana',
        email: 'ana@exemplo.com',
        keycloakSub: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
        empresaId: company.json().id,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'identity_subject_not_found' });
  });
});
