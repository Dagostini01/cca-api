import { afterEach, describe, expect, it } from 'vitest';
import type { IdentityDirectory } from '../../src/modules/users/application/ports/identity-directory.js';
import { IdentitySubjectNotFoundError } from '../../src/modules/users/domain/user-errors.js';
import { createMemoryApp } from '../helpers/memory-app.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const createdId = 'cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa';

describe('HTTP user provisioning', () => {
  const apps: Array<ReturnType<typeof createMemoryApp>['app']> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp(directory: IdentityDirectory) {
    const { app } = createMemoryApp({
      verify: async () => ({ id: subject }),
      directory,
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
      async issueTemporaryPassword() {},
    });
    const headers = { authorization: 'Bearer access-token' };
    const created = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@exemplo.com' },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ keycloakSub: createdId, email: 'ana@exemplo.com', status: 'ATIVADO' });
    expect(created.json()).not.toHaveProperty('password');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/usuarios/${created.json().id}`,
      headers,
      payload: { status: 'DESATIVADO' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ status: 'DESATIVADO', keycloakSub: createdId });
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
      async issueTemporaryPassword() {},
    });
    const headers = { authorization: 'Bearer access-token' };
    const response = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: {
        nome: 'Ana',
        email: 'ana@exemplo.com',
        keycloakSub: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'identity_subject_not_found' });
  });

  function codeDirectory(issued: Array<{ id: string; value: string }>): IdentityDirectory {
    return {
      async provision() {
        return { id: createdId };
      },
      async assertExists() {},
      async sync() {},
      async remove() {},
      async issueTemporaryPassword(id, value) {
        issued.push({ id, value });
      },
    };
  }

  it('issues a one-time access code as a temporary directory password', async () => {
    const issued: Array<{ id: string; value: string }> = [];
    const app = createApp(codeDirectory(issued));
    const headers = { authorization: 'Bearer access-token' };
    const created = await app.inject({ method: 'POST', url: '/v1/usuarios', headers, payload: { nome: 'Ana', email: 'ana@exemplo.com' } });

    const response = await app.inject({ method: 'POST', url: `/v1/usuarios/${created.json().id}/codigo-acesso`, headers });

    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    const { codigo } = response.json() as { codigo: string };
    expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(issued).toEqual([{ id: createdId, value: codigo }]);
  });

  it('refuses an access code for a deactivated user', async () => {
    const issued: Array<{ id: string; value: string }> = [];
    const app = createApp(codeDirectory(issued));
    const headers = { authorization: 'Bearer access-token' };
    const created = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@exemplo.com', status: 'DESATIVADO' },
    });

    const response = await app.inject({ method: 'POST', url: `/v1/usuarios/${created.json().id}/codigo-acesso`, headers });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'access_code_unavailable' });
    expect(issued).toEqual([]);
  });

  it('only lets the managing administrator issue an access code', async () => {
    const issued: Array<{ id: string; value: string }> = [];
    const outsider = 'dddddddd-eeee-4fff-8aaa-bbbbbbbbbbbb';
    const { app } = createMemoryApp({
      authorizer: true,
      directory: codeDirectory(issued),
      verify: async (token) => ({ id: token === 'outsider-token' ? outsider : subject }),
    });
    apps.push(app);
    const headers = { authorization: 'Bearer access-token' };
    await app.inject({ method: 'POST', url: '/v1/usuarios', headers, payload: { nome: 'Admin', email: 'admin@exemplo.com', keycloakSub: subject } });
    const created = await app.inject({ method: 'POST', url: '/v1/usuarios', headers, payload: { nome: 'Ana', email: 'ana@exemplo.com' } });

    const response = await app.inject({
      method: 'POST',
      url: `/v1/usuarios/${created.json().id}/codigo-acesso`,
      headers: { authorization: 'Bearer outsider-token' },
    });

    expect(response.statusCode).toBe(403);
    expect(issued).toEqual([]);
  });

  it('no longer exposes an unauthenticated first-password route', async () => {
    const app = createApp(codeDirectory([]));
    const response = await app.inject({ method: 'POST', url: '/v1/primeiro-acesso', payload: { email: 'ana@exemplo.com', senha: 'qualquer-coisa' } });
    expect(response.statusCode).toBe(404);
  });
});
