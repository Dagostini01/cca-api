import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { createAuditRecorder } from '../../src/modules/audits/application/services/record-audit.js';
import { createAuthorizer } from '../../src/modules/authorization/application/services/authorize-access.js';
import { createWalkingChainResourceLookup } from '../../src/modules/permissions/application/services/walking-chain-resource-lookup.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryAccessRepository } from '../accesses/in-memory-access-repository.js';
import { InMemoryAuditRepository } from '../audits/in-memory-audit-repository.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemoryPermissionRepository } from '../permissions/in-memory-permission-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const missingId = '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d';

describe('HTTP auditoria', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp(withAuthorizer = false) {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const modules = new InMemoryModuleRepository();
    const menus = new InMemoryMenuRepository();
    const submenus = new InMemorySubmenuRepository();
    const users = new InMemoryUserRepository();
    const profiles = new InMemoryProfileRepository();
    const permissions = new InMemoryPermissionRepository();
    const accesses = new InMemoryAccessRepository();
    const audits = new InMemoryAuditRepository();
    const resources = createWalkingChainResourceLookup(companies, systems, modules, menus, submenus);
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: subject }) },
      companyRepository: companies,
      systemRepository: systems,
      moduleRepository: modules,
      menuRepository: menus,
      submenuRepository: submenus,
      userRepository: users,
      profileRepository: profiles,
      permissionRepository: permissions,
      chainResourceLookup: resources,
      accessRepository: accesses,
      auditRepository: audits,
      auditRecorder: createAuditRecorder({ audits, users, profiles, permissions, accesses, systems, resources }),
      authorizer: withAuthorizer
        ? createAuthorizer({ users, accesses, profiles, permissions, systems, resources })
        : undefined,
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('records a company change and refuses a manual write', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const created = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    expect(created.statusCode).toBe(201);
    const listed = await app.inject({ method: 'GET', url: '/v1/auditorias', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([
      expect.objectContaining({
        acao: 'CRIAR',
        recursoTipo: 'EMPRESA',
        recursoId: created.json().id,
        descricao: 'Alfa',
        usuarioId: null,
        usuarioNome: null,
        empresaId: created.json().id,
      }),
    ]);
    expect(JSON.stringify(listed.json())).not.toContain(subject);
    expect(JSON.stringify(listed.json())).not.toContain('keycloakSub');

    const updated = await app.inject({ method: 'PATCH', url: `/v1/empresas/${created.json().id}`, headers, payload: { nome: 'Beta' } });
    expect(updated.statusCode).toBe(200);
    const again = await app.inject({ method: 'GET', url: '/v1/auditorias', headers });
    const rows = again.json() as Array<{ acao: string; descricao: string; ocorridoEm: string }>;
    expect(rows.map((entry) => [entry.acao, entry.descricao])).toEqual(expect.arrayContaining([['ATUALIZAR', 'Beta'], ['CRIAR', 'Alfa']]));
    expect(new Date(rows[0].ocorridoEm).getTime()).toBeGreaterThanOrEqual(new Date(rows[1].ocorridoEm).getTime());

    const found = await app.inject({ method: 'GET', url: `/v1/auditorias/${again.json()[0].id}`, headers });
    expect(found.statusCode).toBe(200);
    const missing = await app.inject({ method: 'GET', url: `/v1/auditorias/${missingId}`, headers });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'audit_not_found' });
    const manual = await app.inject({ method: 'POST', url: '/v1/auditorias', headers, payload: { descricao: 'manual' } });
    expect(manual.statusCode).toBe(404);
  });

  it('hides the history after enforcement when the token has no local grant', async () => {
    const app = createApp(true);
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const empresaId = company.json().id as string;
    const system = await app.inject({ method: 'POST', url: '/v1/sistemas', headers, payload: { nome: 'Escala', empresaId } });
    const user = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@example.com', keycloakSub: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff', empresaId },
    });
    const profile = await app.inject({ method: 'POST', url: '/v1/perfis', headers, payload: { nome: 'Supervisor', empresaId } });
    const open = await app.inject({ method: 'GET', url: '/v1/auditorias', headers });
    expect(open.statusCode).toBe(200);
    expect(open.json().length).toBeGreaterThan(0);

    const access = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { usuarioId: user.json().id, perfilId: profile.json().id, sistemaId: system.json().id },
    });
    expect(access.statusCode).toBe(201);
    const hidden = await app.inject({ method: 'GET', url: '/v1/auditorias', headers });
    expect(hidden.statusCode).toBe(403);
    expect(hidden.json()).toEqual({ error: 'forbidden' });
    const me = await app.inject({ method: 'GET', url: '/v1/me', headers });
    expect(me.statusCode).toBe(200);
  });
});
