import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { InvalidTokenError } from '../../src/modules/identity/application/errors/token-verification-error.js';
import type { TokenVerifier } from '../../src/modules/identity/application/ports/token-verifier.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';

const validCnpj = '11.222.333/0001-81';
const storedCnpj = '11222333000181';

describe('HTTP empresas', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp(verify: TokenVerifier['verify'] = async () => ({ id: 'sub-1' })) {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify },
      companyRepository: new InMemoryCompanyRepository(),
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('requires a bearer token', async () => {
    const verify = vi.fn(async () => ({ id: 'sub-1' }));
    const response = await createApp(verify).inject({ method: 'GET', url: '/v1/empresas' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects an invalid token before touching the company', async () => {
    const response = await createApp(async () => { throw new InvalidTokenError(); }).inject({
      method: 'POST',
      url: '/v1/empresas',
      headers: { authorization: 'Bearer bad' },
      payload: { razaoSocial: 'Alfa', cnpj: validCnpj },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'invalid_token' });
    expect(response.body).not.toContain(storedCnpj);
  });

  it('creates, lists, reads and updates a company', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };

    const created = await app.inject({
      method: 'POST',
      url: '/v1/empresas',
      headers,
      payload: { razaoSocial: ' Beta ', cnpj: validCnpj },
    });
    expect(created.statusCode).toBe(201);
    const company = created.json();
    expect(company).toMatchObject({ razaoSocial: 'Beta', cnpj: storedCnpj, status: 'ATIVADO' });
    expect(company.criadoEm).toEqual(expect.any(String));
    expect(created.body).not.toContain(validCnpj);

    const listed = await app.inject({ method: 'GET', url: '/v1/empresas', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ id: company.id, razaoSocial: 'Beta' })]);

    const fetched = await app.inject({ method: 'GET', url: `/v1/empresas/${company.id}`, headers });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toMatchObject({ id: company.id, cnpj: storedCnpj });

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/empresas/${company.id}`,
      headers,
      payload: { status: 'DESATIVADO', cnpj: null },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ id: company.id, razaoSocial: 'Beta', cnpj: null, status: 'DESATIVADO' });
  });

  it('returns validation, conflict and not-found errors without the document', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { razaoSocial: 'Alfa', cnpj: validCnpj } });

    const invalid = await app.inject({
      method: 'POST',
      url: '/v1/empresas',
      headers,
      payload: { razaoSocial: 'Gama', cnpj: '11.222.333/0001-80', extra: true },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error).toBe('validation_error');
    expect(invalid.body).not.toContain('11222333000180');
    expect(invalid.body).not.toContain(validCnpj);

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/empresas',
      headers,
      payload: { razaoSocial: 'Delta', cnpj: storedCnpj },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: 'company_document_conflict' });
    expect(conflict.body).not.toContain(storedCnpj);

    const missing = await app.inject({ method: 'GET', url: '/v1/empresas/999', headers });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'company_not_found' });

    const empty = await app.inject({
      method: 'PATCH',
      url: '/v1/empresas/999',
      headers,
      payload: {},
    });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error).toBe('validation_error');

    const filtered = await app.inject({ method: 'GET', url: '/v1/empresas?q=Alfa&pagina=1&tamanho=5', headers });
    expect(filtered.statusCode).toBe(200);
    expect(filtered.json()).toMatchObject({ total: 1, pagina: 1, tamanho: 5 });
    expect(filtered.json().itens).toEqual([expect.objectContaining({ razaoSocial: 'Alfa' })]);

    const malformed = await app.inject({ method: 'GET', url: '/v1/empresas/nao-e-id', headers });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json().error).toBe('validation_error');
  });
});
