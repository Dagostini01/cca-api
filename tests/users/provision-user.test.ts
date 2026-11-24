import { describe, expect, it } from 'vitest';
import type { DirectoryProfile, IdentityDirectory } from '../../src/modules/users/application/ports/identity-directory.js';
import {
  IdentityEmailConflictError,
  IdentitySubjectNotFoundError,
  InvalidUserSubjectError,
  UserEmailConflictError,
} from '../../src/modules/users/domain/user-errors.js';
import { createMemoryUserServices } from '../helpers/memory-graph.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const createdId = 'cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa';
const secondId = 'dddddddd-eeee-4fff-8aaa-bbbbbbbbbbbb';

describe('user provisioning', () => {
  function services(directory?: IdentityDirectory) {
    return createMemoryUserServices(undefined, directory);
  }

  it('rejects a create without subject when no directory is configured', async () => {
    const users = services();
    await expect(users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
    }, subject)).rejects.toBeInstanceOf(InvalidUserSubjectError);
  });

  it('stores the id returned by the directory and does not accept a password', async () => {
    const provisioned: DirectoryProfile[] = [];
    const users = services({
      async provision(profile) {
        provisioned.push(profile);
        return { id: createdId.toUpperCase() };
      },
      async assertExists() {},
      async sync() {},
      async remove() {},
      async issueTemporaryPassword() {},
    });
    const created = await users.createUser.execute({
      nome: 'Ana',
      email: 'Ana@Exemplo.com',
    }, subject);

    expect(created.keycloakSub).toBe(createdId);
    expect(provisioned).toEqual([{ nome: 'Ana', email: 'ana@exemplo.com', enabled: true }]);
    expect(provisioned[0]).not.toHaveProperty('password');
  });

  it('links an existing subject without creating another directory user', async () => {
    const calls: string[] = [];
    const users = services({
      async provision() {
        calls.push('provision');
        return { id: createdId };
      },
      async assertExists(id) {
        calls.push(`exists:${id}`);
      },
      async sync() {},
      async remove() {},
      async issueTemporaryPassword() {},
    });
    const created = await users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      keycloakSub: subject,
    }, subject);

    expect(created.keycloakSub).toBe(subject);
    expect(calls).toEqual([`exists:${subject}`]);
  });

  it('removes a directory user created in this request when the local insert conflicts', async () => {
    const removed: string[] = [];
    const ids = [createdId, secondId];
    const users = services({
      async provision() {
        const id = ids.shift();
        if (!id) throw new Error('missing id');
        return { id };
      },
      async assertExists() {},
      async sync() {},
      async remove(id) {
        removed.push(id);
      },
      async issueTemporaryPassword() {},
    });
    await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com' }, subject);
    await expect(users.createUser.execute({
      nome: 'Ana 2',
      email: 'ana@exemplo.com',
    }, subject)).rejects.toBeInstanceOf(UserEmailConflictError);
    expect(removed).toEqual([secondId]);
  });

  it('maps a missing subject and a directory email conflict', async () => {
    const users = services({
      async provision() {
        throw new IdentityEmailConflictError();
      },
      async assertExists() {
        throw new IdentitySubjectNotFoundError();
      },
      async sync() {},
      async remove() {},
      async issueTemporaryPassword() {},
    });
    await expect(users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      keycloakSub: subject,
    }, subject)).rejects.toBeInstanceOf(IdentitySubjectNotFoundError);
    await expect(users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
    }, subject)).rejects.toBeInstanceOf(IdentityEmailConflictError);
  });

  it('syncs enabled when the local status changes', async () => {
    const synced: boolean[] = [];
    const users = services({
      async provision() {
        return { id: createdId };
      },
      async assertExists() {},
      async sync(_id, profile) {
        synced.push(profile.enabled);
      },
      async remove() {},
      async issueTemporaryPassword() {},
    });
    const created = await users.createUser.execute({ nome: 'Ana', email: 'ana@exemplo.com' }, subject);
    const updated = await users.updateUser.execute(created.id, { status: 'DESATIVADO' });

    expect(updated.status).toBe('DESATIVADO');
    expect(updated.keycloakSub).toBe(createdId);
    expect(synced).toEqual([false]);
  });
});
