import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { testEnv } from '../helpers/env.js';

describe('Scalar API reference', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const app = buildApp(testEnv, { tokenVerifier: { verify: async () => ({ id: 'unused' }) }, logger: false });
    apps.push(app);
    return app;
  }

  it('redirects /docs to the Scalar page', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/docs' });
    expect(response.statusCode).toBe(301);
    expect(response.headers.location).toBe('/docs/');
  });

  it('renders the reference without a token', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/docs/' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('CCA API');
    expect(response.body.toLowerCase()).toContain('scalar');
  });

  it('publishes the OpenAPI document generated from the Zod contracts', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/docs/openapi.json' });
    expect(response.statusCode).toBe(200);
    const document = response.json();
    expect(document.openapi).toBe('3.1.0');
    expect(document.info.title).toBe('CCA API');
    expect(document.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    expect(document.paths['/health'].get.security).toBeUndefined();
    expect(document.info.description).toContain('ADMINITRADOR');
    expect(document.paths['/v1/me'].get.responses['403']).toBeUndefined();
    expect(document.paths['/v1/usuarios/eu'].get.responses['403']).toBeUndefined();
    expect(document.paths['/v1/empresas'].get.responses['403'].description).toBe('forbidden');
    expect(document.paths['/v1/modulos'].post.responses['403'].description).toBe('forbidden');
    expect(document.paths['/v1/me'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(document.paths['/v1/empresas'].post.security).toEqual([{ bearerAuth: [] }]);

    const systemBody = document.paths['/v1/sistemas'].post.requestBody.content['application/json'].schema;
    expect(systemBody.required).toEqual(expect.arrayContaining(['nome', 'empresaIds']));
    expect(systemBody.properties.empresaId).toBeUndefined();
    expect(systemBody.properties.empresaIds.type).toBe('array');
    expect(document.paths['/v1/sistemas'].get.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'empresaId', in: 'query' })]),
    );
    expect(document.paths['/v1/modulos'].post.requestBody.content['application/json'].schema.required).toEqual(
      expect.arrayContaining(['nome', 'sistemaId']),
    );
    expect(document.paths['/v1/menus'].post.requestBody.content['application/json'].schema.required).toEqual(
      expect.arrayContaining(['nome', 'moduloId']),
    );
    expect(document.paths['/v1/submenus'].post.requestBody.content['application/json'].schema.required).toEqual(
      expect.arrayContaining(['nome', 'menuId']),
    );
    expect(document.paths['/v1/usuarios'].post.requestBody.content['application/json'].schema.required).toEqual(
      expect.arrayContaining(['nome', 'email']),
    );
    expect(document.paths['/v1/usuarios'].post.requestBody.content['application/json'].schema.required).not.toContain('keycloakSub');
    expect(document.paths['/v1/usuarios'].post.requestBody.content['application/json'].schema.properties.keycloakSub).toBeTruthy();
    expect(document.paths['/v1/usuarios'].post.requestBody.content['application/json'].schema.properties.telas).toBeTruthy();
    expect(document.paths['/v1/usuarios/eu'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(document.paths['/v1/usuarios/{id}/codigo-acesso'].post.security).toEqual([{ bearerAuth: [] }]);
    expect(document.paths['/v1/primeiro-acesso']).toBeUndefined();
    expect(document.paths['/v1/perfis']).toBeUndefined();
    expect(document.paths['/v1/permissoes']).toBeUndefined();
    const required = document.paths['/v1/acessos'].post.requestBody.content['application/json'].schema.required;
    expect(required).toEqual(expect.arrayContaining(['usuarioId', 'empresaId', 'submenuId']));
    expect(required).not.toContain('sistemaId');
    expect(required).not.toContain('moduloId');
    expect(required).not.toContain('menuId');
    expect(document.paths['/v1/auditorias'].post).toBeUndefined();
    expect(document.paths['/v1/auditorias/{id}'].delete).toBeUndefined();
    expect(document.paths['/v1/empresas/{id}'].delete.responses['204']).toBeTruthy();
    expect(document.paths['/v1/empresas/{id}'].delete.responses['409'].description).toBe('delete_restricted');
    expect(document.paths['/v1/auditorias'].get.responses['200']).toBeTruthy();
    expect(document.paths['/v1/auditorias/{id}'].patch).toBeUndefined();
    expect(document.paths['/v1/importacoes/legado'].post.requestBody.content['application/json'].schema.properties.senha).toBeUndefined();
    expect(document.paths['/v1/importacoes/legado'].post.responses['200']).toBeTruthy();
  });
});
