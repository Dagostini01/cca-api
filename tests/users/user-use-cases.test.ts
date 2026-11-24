import { describe, expect, it } from 'vitest';
import {
  EmptyUserUpdateError,
  InvalidUserEmailError,
  InvalidUserSubjectError,
  UserEmailConflictError,
  UserNotFoundError,
  UserSubjectConflictError,
} from '../../src/modules/users/domain/user-errors.js';
import { createMemoryGraph, createMemoryUserServices } from '../helpers/memory-graph.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('user use cases', () => {
  it('stores a normalized email and records who created the user', async () => {
    const graph = createMemoryGraph();
    const users = createMemoryUserServices(graph);
    const admin = await users.createUser.execute({
      nome: 'Admin',
      email: 'admin@exemplo.com',
      keycloakSub: subject,
    }, 'ainda-nao-existe');
    const created = await users.createUser.execute({
      nome: '  Ana Costa  ',
      email: 'Ana.Costa@Exemplo.com',
      keycloakSub: otherSubject.toUpperCase(),
    }, subject);

    expect(created).toMatchObject({
      nome: 'Ana Costa',
      email: 'ana.costa@exemplo.com',
      keycloakSub: otherSubject,
      tipo: 'ADMINITRADOR',
      status: 'ATIVADO',
      criadoPorId: admin.id,
    });
    expect(created).not.toHaveProperty('senha');
    expect(admin.criadoPorId).toBeNull();
  });

  it('rejects a repeated subject or email and a subject that is not a uuid', async () => {
    const users = createMemoryUserServices();
    await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject }, subject);

    await expect(users.createUser.execute({
      nome: 'Ana 2',
      email: 'ANA@exemplo.com',
      keycloakSub: otherSubject,
    }, subject)).rejects.toBeInstanceOf(UserEmailConflictError);
    await expect(users.createUser.execute({
      nome: 'Bruno',
      email: 'bruno@exemplo.com',
      keycloakSub: subject,
    }, subject)).rejects.toBeInstanceOf(UserSubjectConflictError);
    await expect(users.createUser.execute({
      nome: 'Bruno',
      email: 'bruno@exemplo.com',
      keycloakSub: 'sub-1',
    }, subject)).rejects.toBeInstanceOf(InvalidUserSubjectError);
    await expect(users.createUser.execute({
      nome: 'Bruno',
      email: 'sem-arroba',
      keycloakSub: otherSubject,
    }, subject)).rejects.toBeInstanceOf(InvalidUserEmailError);
  });

  it('lists only the users created by the actor and keeps the subject unchanged', async () => {
    const users = createMemoryUserServices();
    const admin = await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject }, subject);
    await users.createUser.execute({ nome: 'Bruno', email: 'bruno@exemplo.com', keycloakSub: otherSubject }, subject);

    const mine = await users.getUserBySubject.execute(subject);
    expect(mine.id).toBe(admin.id);
    await expect(users.getUserBySubject.execute('cccccccc-dddd-4eee-8fff-000000000000')).rejects.toBeInstanceOf(UserNotFoundError);

    const updated = await users.updateUser.execute(admin.id, { status: 'DESATIVADO', nome: 'Ana Lima' });
    expect(updated).toMatchObject({ status: 'DESATIVADO', nome: 'Ana Lima', keycloakSub: subject });
    expect(await users.listUsers.execute(subject, { pagina: 1, tamanho: 20 })).toEqual({
      itens: [expect.objectContaining({ nome: 'Bruno' })],
      total: 1,
      pagina: 1,
      tamanho: 20,
    });
    await expect(users.updateUser.execute(admin.id, {})).rejects.toBeInstanceOf(EmptyUserUpdateError);
  });
});
