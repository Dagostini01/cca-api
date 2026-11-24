import { describe, expect, it } from 'vitest';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { SystemNameConflictError, SystemNotFoundError } from '../../src/modules/systems/domain/system-errors.js';
import { InMemorySystemRepository } from './in-memory-system-repository.js';

describe('system use cases', () => {
  function services() {
    return createSystemServices(new InMemorySystemRepository());
  }

  it('creates a global system with the default status', async () => {
    const { createSystem } = services();
    const created = await createSystem.execute({ nome: '  Escala  ' });
    expect(created).toMatchObject({ nome: 'Escala', status: 'ATIVADO' });
    expect(created).not.toHaveProperty('empresaId');
  });

  it('rejects the same name anywhere in the catalog', async () => {
    const { createSystem, listSystems } = services();
    await createSystem.execute({ nome: 'Escala' });
    await expect(createSystem.execute({ nome: 'escala' })).rejects.toBeInstanceOf(SystemNameConflictError);
    const listed = await listSystems.execute();
    expect(listed.map((system) => system.nome)).toEqual(['Escala']);
  });

  it('inactivates a system without moving it between companies', async () => {
    const { createSystem, updateSystem } = services();
    const created = await createSystem.execute({ nome: 'Escala' });
    const updated = await updateSystem.execute(created.id, { status: 'DESATIVADO' });
    expect(updated).toMatchObject({ nome: 'Escala', status: 'DESATIVADO' });
  });

  it('reports a missing system', async () => {
    const { getSystem } = services();
    await expect(getSystem.execute(999)).rejects.toBeInstanceOf(SystemNotFoundError);
  });
});
