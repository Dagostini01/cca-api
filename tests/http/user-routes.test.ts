import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('HTTP usuarios', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp(tokenSubject = subject) {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: tokenSubject }) },
      companyRepository: new InMemoryCompanyRepository(),
      userRepository: new InMemoryUserRepository(),
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('requires a bearer token', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/v1/usuarios' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('creates a user bound to a company and resolves /eu by the token subject', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const other = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Beta' } });
    const empresaId = company.json().id as string;

    const missingLocal = await app.inject({ method: 'GET', url: '/v1/usuarios/eu', headers });
    expect(missingLocal.statusCode).toBe(404);
    expect(missingLocal.json()).toEqual({ error: 'user_not_found' });

    const missingCompany = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: {
        nome: 'Ana',
        email: 'ana@exemplo.com',
        keycloakSub: subject,
        empresaId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d',
      },
    });
    expect(missingCompany.statusCode).toBe(404);
    expect(missingCompany.json()).toEqual({ error: 'company_not_found' });

    const created = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: ' Ana ', email: 'Ana@Exemplo.com', keycloakSub: subject, empresaId },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      keycloakSub: subject,
      empresaId,
      status: 'ATIVO',
    });
    expect(created.json()).not.toHaveProperty('senha');
    expect(JSON.stringify(created.json())).not.toMatch(/cpf|rg|password/i);

    const mine = await app.inject({ method: 'GET', url: '/v1/usuarios/eu', headers });
    expect(mine.statusCode).toBe(200);
    expect(mine.json().id).toBe(created.json().id);

    const emailConflict = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Outra', email: 'ana@exemplo.com', keycloakSub: otherSubject, empresaId },
    });
    expect(emailConflict.statusCode).toBe(409);
    expect(emailConflict.json()).toEqual({ error: 'user_email_conflict' });

    const subjectConflict = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Outra', email: 'outra@exemplo.com', keycloakSub: subject, empresaId },
    });
    expect(subjectConflict.statusCode).toBe(409);
    expect(subjectConflict.json()).toEqual({ error: 'user_subject_conflict' });

    const listed = await app.inject({ method: 'GET', url: `/v1/usuarios?empresaId=${empresaId}`, headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ id: created.json().id, empresaId })]);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/usuarios/${created.json().id}`,
      headers,
      payload: { status: 'INATIVO', empresaId: other.json().id, keycloakSub: otherSubject },
    });
    expect(updated.statusCode).toBe(400);
    expect(updated.json().error).toBe('validation_error');

    const moved = await app.inject({
      method: 'PATCH',
      url: `/v1/usuarios/${created.json().id}`,
      headers,
      payload: { status: 'INATIVO', empresaId: other.json().id },
    });
    expect(moved.statusCode).toBe(200);
    expect(moved.json()).toMatchObject({ status: 'INATIVO', empresaId: other.json().id, keycloakSub: subject });
  });

  it('rejects an empty update and a route id that is not a uuid', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const created = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject, empresaId: company.json().id },
    });
    const empty = await app.inject({
      method: 'PATCH',
      url: `/v1/usuarios/${created.json().id}`,
      headers,
      payload: {},
    });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error).toBe('validation_error');

    const invalidId = await app.inject({ method: 'GET', url: '/v1/usuarios/eu-nao', headers });
    expect(invalidId.statusCode).toBe(400);
    expect(invalidId.json().error).toBe('validation_error');
  });
});
