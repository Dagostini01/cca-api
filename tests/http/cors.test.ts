import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { testEnv } from '../helpers/env.js';

describe('CORS', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const app = buildApp(testEnv, { logger: false });
    apps.push(app);
    return app;
  }

  it('allows the local frontend to call the API with a bearer token', async () => {
    const response = await createApp().inject({
      method: 'OPTIONS',
      url: '/v1/empresas',
      headers: {
        origin: 'http://127.0.0.1:4173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type',
      },
    });

    expect(response.statusCode).toBeLessThan(400);
    expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:4173');
    expect(String(response.headers['access-control-allow-methods'])).toContain('POST');
    expect(String(response.headers['access-control-allow-methods'])).toContain('PATCH');
    expect(String(response.headers['access-control-allow-methods'])).toContain('DELETE');
    expect(String(response.headers['access-control-allow-headers']).toLowerCase()).toContain('authorization');
  });

  it('does not reflect an origin outside the allow list', async () => {
    const response = await createApp().inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://evil.example' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
