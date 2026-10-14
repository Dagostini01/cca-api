import { describe, expect, it } from 'vitest';
import { createKeycloakUserDirectory } from '../../src/modules/users/adapters/outbound/keycloak-user-directory.js';
import {
  IdentityDirectoryUnavailableError,
  IdentityEmailConflictError,
  IdentitySubjectNotFoundError,
} from '../../src/modules/users/domain/user-errors.js';

const config = {
  baseUrl: 'http://keycloak:8080',
  realm: 'cca',
  clientId: 'cca-provisioner',
  clientSecret: 'test-secret',
};
const userId = 'cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa';

describe('keycloak user directory', () => {
  it('creates a user without a password and reads the id from Location', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const directory = createKeycloakUserDirectory(config, async (input, init) => {
      const url = String(input);
      calls.push({ url, body: typeof init?.body === 'string' ? init.body : String(init?.body ?? '') });
      if (url.endsWith('/protocol/openid-connect/token')) {
        return Response.json({ access_token: 'token-1', expires_in: 300 });
      }
      return new Response(null, { status: 201, headers: { location: `http://keycloak:8080/admin/realms/cca/users/${userId}` } });
    });

    await expect(directory.provision({ nome: 'Ana', email: 'ana@exemplo.com', enabled: true })).resolves.toEqual({ id: userId });
    const created = JSON.parse(calls[1]?.body ?? '{}') as Record<string, unknown>;
    expect(created).toMatchObject({
      username: 'ana@exemplo.com',
      email: 'ana@exemplo.com',
      firstName: 'Ana',
      enabled: true,
      emailVerified: false,
      requiredActions: ['UPDATE_PASSWORD'],
    });
    expect(created).not.toHaveProperty('password');
    expect(created).not.toHaveProperty('credentials');
    expect(calls[0]?.body).toContain('grant_type=client_credentials');
    expect(calls[0]?.body).toContain('client_id=cca-provisioner');
  });

  it('maps a directory conflict and a missing subject', async () => {
    const conflict = createKeycloakUserDirectory(config, async (input) => {
      if (String(input).endsWith('/token')) return Response.json({ access_token: 'token-1', expires_in: 300 });
      return new Response(null, { status: 409 });
    });
    await expect(conflict.provision({ nome: 'Ana', email: 'ana@exemplo.com', enabled: true })).rejects.toBeInstanceOf(IdentityEmailConflictError);

    const missing = createKeycloakUserDirectory(config, async (input) => {
      if (String(input).endsWith('/token')) return Response.json({ access_token: 'token-1', expires_in: 300 });
      return new Response(null, { status: 404 });
    });
    await expect(missing.assertExists(userId)).rejects.toBeInstanceOf(IdentitySubjectNotFoundError);
  });

  it('updates the existing representation and drops credentials', async () => {
    const calls: string[] = [];
    const directory = createKeycloakUserDirectory(config, async (input, init) => {
      const url = String(input);
      if (url.endsWith('/token')) return Response.json({ access_token: 'token-1', expires_in: 300 });
      if (init?.method === 'PUT') {
        calls.push(typeof init.body === 'string' ? init.body : '');
        return new Response(null, { status: 204 });
      }
      return Response.json({
        id: userId,
        username: 'ana@exemplo.com',
        email: 'ana@exemplo.com',
        firstName: 'Ana',
        enabled: true,
        credentials: [{ type: 'password' }],
      });
    });

    await directory.sync(userId, { nome: 'Ana Lima', email: 'ana.lima@exemplo.com', enabled: false });
    const updated = JSON.parse(calls[0] ?? '{}') as Record<string, unknown>;
    expect(updated).toMatchObject({
      firstName: 'Ana Lima',
      email: 'ana.lima@exemplo.com',
      username: 'ana.lima@exemplo.com',
      enabled: false,
    });
    expect(updated).not.toHaveProperty('credentials');
  });

  it('reports the directory unavailable when the token request fails', async () => {
    const directory = createKeycloakUserDirectory(config, async () => {
      throw new Error('offline');
    });
    await expect(directory.provision({ nome: 'Ana', email: 'ana@exemplo.com', enabled: false })).rejects.toBeInstanceOf(IdentityDirectoryUnavailableError);
  });
});
