import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { InvalidTokenError, TokenVerifierUnavailableError } from '../../src/modules/identity/application/errors/token-verification-error.js';
import type { AuthenticatedUser } from '../../src/modules/identity/domain/entities/authenticated-user.js';
import type { TokenVerifier } from '../../src/modules/identity/application/ports/token-verifier.js';
import { testEnv } from '../helpers/env.js';

describe('HTTP identity', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp(verify: TokenVerifier['verify'] = async () => ({ id: 'unused' })) {
    const tokenVerifier: TokenVerifier = { verify };
    const app = buildApp(testEnv, { tokenVerifier, logger: false });
    apps.push(app);
    return app;
  }

  it('returns ok from the health check without a token', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'cca-api' });
  });

  it('rejects a missing or empty bearer token', async () => {
    const verify = vi.fn(async () => ({ id: 'sub-1' }));
    const app = createApp(verify);

    const missing = await app.inject({ method: 'GET', url: '/v1/me' });
    const empty = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer   ' } });
    const basic = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Basic abc' } });

    expect(missing.statusCode).toBe(401);
    expect(missing.json()).toEqual({ error: 'unauthorized' });
    expect(empty.json()).toEqual({ error: 'unauthorized' });
    expect(basic.json()).toEqual({ error: 'unauthorized' });
    expect(verify).not.toHaveBeenCalled();
  });

  it('returns the authenticated user for a valid token', async () => {
    const user: AuthenticatedUser = { id: 'sub-1', username: 'ana', email: 'ana@datasite.com.br' };
    const verify = vi.fn(async () => user);
    const response = await createApp(verify).inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Bearer   access-token  ' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(user);
    expect(verify).toHaveBeenCalledWith('access-token');
  });

  it('rejects an invalid token', async () => {
    const response = await createApp(async () => { throw new InvalidTokenError(); }).inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Bearer bad' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'invalid_token' });
  });

  it('reports when the token verifier is unavailable', async () => {
    const response = await createApp(async () => { throw new TokenVerifierUnavailableError(); }).inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Bearer any' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'token_verifier_unavailable' });
  });

  it('hides unexpected verifier failures', async () => {
    const response = await createApp(async () => { throw new Error('secret detail'); }).inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Bearer any' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'internal_error' });
    expect(response.body).not.toContain('secret detail');
  });
});
