import { describe, expect, it } from 'vitest';
import { ImportLegacyCatalog } from '../../src/modules/legacy-import/application/use-cases/import-legacy-catalog.js';
import type { LegacyCatalog } from '../../src/modules/legacy-import/domain/legacy-catalog.js';
import { InMemoryAccessRepository } from '../accesses/in-memory-access-repository.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function catalog(overrides: Partial<LegacyCatalog> = {}): LegacyCatalog {
  return {
    statuses: [{ id: 1, nome: 'ATIVADO' }, { id: 2, nome: 'DESATIVADO' }],
    companies: [{ id: 1, nome: 'Casa', cnpj: '0', statusId: 1 }],
    systems: [{ id: 1, parentId: null, nome: 'Portal', statusId: 1 }],
    modules: [{ id: 1, parentId: 1, nome: 'Operacao', statusId: 1 }],
    menus: [{ id: 4, parentId: 1, nome: 'Logistica', statusId: 2 }],
    submenus: [{ id: 1, parentId: 4, nome: 'Documento', statusId: 1 }],
    profiles: [{ id: 1, nome: 'Supervisor', statusId: 1 }],
    users: [{ nome: 'Ana Costa', email: null, statusId: 1, perfilId: 1 }],
    accesses: [],
    senhasIgnoradas: 1,
    ...overrides,
  };
}

describe('import legacy catalog', () => {
  function importer() {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const modules = new InMemoryModuleRepository();
    const menus = new InMemoryMenuRepository();
    const submenus = new InMemorySubmenuRepository();
    const users = new InMemoryUserRepository();
    const accesses = new InMemoryAccessRepository();
    return {
      companies,
      systems,
      menus,
      accesses,
      catalogImport: new ImportLegacyCatalog({ companies, systems, modules, menus, submenus, users, accesses }),
    };
  }

  it('places the global chain and ignores a user without email', async () => {
    const { companies, systems, menus, catalogImport } = importer();
    const report = await catalogImport.execute(catalog());

    expect(report.empresas.criadas).toBe(1);
    expect(report.documentosIgnorados).toBe(1);
    expect(report.senhasIgnoradas).toBe(1);
    expect(report.sistemas.criadas).toBe(1);
    expect(report.modulos.criadas).toBe(1);
    expect(report.menus.criadas).toBe(1);
    expect(report.submenus.criadas).toBe(1);
    expect(report.usuarios.ignoradas).toBe(1);
    expect(report).not.toHaveProperty('perfis');
    expect(report).not.toHaveProperty('permissoes');
    expect((await companies.list())[0]).toMatchObject({ razaoSocial: 'Casa', cnpj: null, status: 'ATIVADO' });
    expect((await systems.list())[0]).toMatchObject({ nome: 'Portal', status: 'ATIVADO' });
    expect((await menus.list())[0]).toMatchObject({ nome: 'Logistica', status: 'DESATIVADO' });

    const again = await catalogImport.execute(catalog());
    expect(again.empresas).toMatchObject({ criadas: 0, existentes: 1 });
    expect(again.sistemas.existentes).toBe(1);
    expect(await companies.list()).toHaveLength(1);
  });

  it('imports systems once even when several companies exist', async () => {
    const { companies, systems, catalogImport } = importer();
    const report = await catalogImport.execute(catalog({
      companies: [
        { id: 1, nome: 'Casa', cnpj: null, statusId: 1 },
        { id: 2, nome: 'Outra', cnpj: null, statusId: 1 },
      ],
    }));
    expect(report.empresas.criadas).toBe(2);
    expect(report.sistemas.criadas).toBe(1);
    expect(await companies.list()).toHaveLength(2);
    expect(await systems.list()).toHaveLength(1);
  });

  it('links a user by subject and grants the screen from an access row', async () => {
    const { catalogImport, companies, accesses } = importer();
    const report = await catalogImport.execute(catalog({
      users: [{ nome: 'Ana Costa', email: 'ana@exemplo.com', statusId: 1, perfilId: 1 }],
      accesses: [{ email: 'ana@exemplo.com', empresaId: 1, sistemaId: 1, submenuId: 1, perfilId: 1, statusId: 1 }],
    }), undefined, [{ email: 'ana@exemplo.com', keycloakSub: subject }]);

    expect(report.usuarios.criadas).toBe(1);
    expect(report.acessos.criadas).toBe(1);
    expect((await companies.list())[0]?.cnpj).toBeNull();
    expect(await accesses.list()).toHaveLength(1);

    const again = await catalogImport.execute(catalog({
      users: [{ nome: 'Ana Costa', email: 'ana@exemplo.com', statusId: 1, perfilId: 1 }],
      accesses: [{ email: 'ana@exemplo.com', empresaId: 1, sistemaId: 1, submenuId: 1, perfilId: 1, statusId: 1 }],
    }), undefined, [{ email: 'ana@exemplo.com', keycloakSub: subject }]);
    expect(again.usuarios.existentes).toBe(1);
    expect(again.acessos.existentes).toBe(1);
  });
});
