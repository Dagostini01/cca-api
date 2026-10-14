import { describe, expect, it } from 'vitest';
import { createAuditRecorder } from '../../src/modules/audits/application/services/record-audit.js';
import { ListAudits } from '../../src/modules/audits/application/use-cases/read-audits.js';
import { InvalidAuditDescriptionError } from '../../src/modules/audits/domain/audit-errors.js';
import { createWalkingChainResourceLookup } from '../../src/modules/permissions/application/services/walking-chain-resource-lookup.js';
import { createUserServices } from '../../src/modules/users/application/factories/user-services-factory.js';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { InMemoryAccessRepository } from '../accesses/in-memory-access-repository.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemoryPermissionRepository } from '../permissions/in-memory-permission-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';
import { InMemoryAuditRepository } from './in-memory-audit-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('audit trail', () => {
  function world() {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const users = new InMemoryUserRepository();
    const profiles = new InMemoryProfileRepository();
    const permissions = new InMemoryPermissionRepository();
    const accesses = new InMemoryAccessRepository();
    const audits = new InMemoryAuditRepository();
    const resources = createWalkingChainResourceLookup(
      companies,
      systems,
      new InMemoryModuleRepository(),
      new InMemoryMenuRepository(),
      new InMemorySubmenuRepository(),
    );
    return {
      companies: createCompanyServices(companies),
      users: createUserServices(users, companies),
      audits,
      recorder: createAuditRecorder({ audits, users, profiles, permissions, accesses, systems, resources }),
    };
  }

  it('stores the local user name and leaves the subject out of the row', async () => {
    const { companies, users, audits, recorder } = world();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const user = await users.createUser.execute({
      nome: 'Ana',
      email: 'ana@example.com',
      keycloakSub: subject,
      empresaId: company.id,
    });
    await recorder.record({ subject, acao: 'CRIAR', recursoTipo: 'EMPRESA', recursoId: company.id, descricao: '  Alfa  ' });
    const [entry] = await audits.list();
    expect(entry).toMatchObject({
      usuarioId: user.id,
      usuarioNome: 'Ana',
      acao: 'CRIAR',
      recursoTipo: 'EMPRESA',
      recursoId: company.id,
      descricao: 'Alfa',
      empresaId: company.id,
    });
    expect(JSON.stringify(entry)).not.toContain(subject);
    await expect(recorder.record({ subject, acao: 'CRIAR', recursoTipo: 'EMPRESA', recursoId: company.id, descricao: '   ' })).rejects.toBeInstanceOf(InvalidAuditDescriptionError);
  });

  it('lists the newest event first', async () => {
    const audits = new InMemoryAuditRepository();
    const older = await audits.add({
      ocorridoEm: new Date('2026-09-07T16:12:00.000Z'),
      usuarioId: null,
      usuarioNome: null,
      acao: 'CRIAR',
      recursoTipo: 'SISTEMA',
      recursoId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d',
      descricao: 'Portal',
      empresaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    });
    const newer = await audits.add({
      ocorridoEm: new Date('2026-09-08T10:24:00.000Z'),
      usuarioId: null,
      usuarioNome: null,
      acao: 'CRIAR',
      recursoTipo: 'USUARIO',
      recursoId: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
      descricao: 'Mariana Costa',
      empresaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    });
    const listed = await new ListAudits(audits).execute();
    expect(listed.map((entry) => entry.id)).toEqual([newer.id, older.id]);
    const filtered = await new ListAudits(audits).execute({ desde: new Date('2026-09-08T00:00:00.000Z') });
    expect(filtered.map((entry) => entry.id)).toEqual([newer.id]);
  });
});
