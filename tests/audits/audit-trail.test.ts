import { describe, expect, it } from 'vitest';
import { createAuditRecorder } from '../../src/modules/audits/application/services/record-audit.js';
import { ListAudits } from '../../src/modules/audits/application/use-cases/read-audits.js';
import { InvalidAuditDescriptionError } from '../../src/modules/audits/domain/audit-errors.js';
import { createMemoryGraph, createMemoryUserServices } from '../helpers/memory-graph.js';
import { InMemoryAuditRepository } from './in-memory-audit-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('audit trail', () => {
  it('stores the local user id and leaves the subject out of the row', async () => {
    const graph = createMemoryGraph();
    const users = createMemoryUserServices(graph);
    const audits = new InMemoryAuditRepository();
    const recorder = createAuditRecorder({ audits, users: graph.users });
    const user = await users.createUser.execute({
      nome: 'Ana',
      email: 'ana@example.com',
      keycloakSub: subject,
    }, subject);
    await recorder.record({ subject, acao: 'CRIAR', recursoTipo: 'EMPRESA', recursoId: 1, descricao: '  Alfa  ' });
    const [entry] = await audits.list();
    expect(entry).toMatchObject({
      usuarioId: user.id,
      acao: 'CRIAR',
      recursoTipo: 'EMPRESA',
      descricao: 'Alfa',
    });
    expect(JSON.stringify(entry)).not.toContain(subject);
    await expect(recorder.record({
      subject,
      acao: 'CRIAR',
      recursoTipo: 'EMPRESA',
      recursoId: 1,
      descricao: '   ',
    })).rejects.toBeInstanceOf(InvalidAuditDescriptionError);
  });

  it('lists the newest event first', async () => {
    const audits = new InMemoryAuditRepository();
    const older = await audits.add({
      usuarioId: null,
      acao: 'CRIAR',
      recursoTipo: 'SISTEMA',
      descricao: 'Portal',
    }, new Date('2026-09-07T16:12:00.000Z'));
    const newer = await audits.add({
      usuarioId: null,
      acao: 'CRIAR',
      recursoTipo: 'USUARIO',
      descricao: 'Ana',
    }, new Date('2026-09-08T10:24:00.000Z'));
    const listed = await new ListAudits(audits).execute();
    expect(listed.map((entry) => entry.id)).toEqual([newer.id, older.id]);
    const filtered = await new ListAudits(audits).execute({ desde: new Date('2026-09-08T00:00:00.000Z') });
    expect(filtered.map((entry) => entry.id)).toEqual([newer.id]);
  });
});
