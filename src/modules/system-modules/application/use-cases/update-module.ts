import { normalizeModuleName, type Module, type ModuleStatus } from '../../domain/module.js';
import { EmptyModuleUpdateError, ModuleNotFoundError, ModuleSystemNotFoundError } from '../../domain/module-errors.js';
import type { ModuleRepository } from '../ports/module-repository.js';
import type { ParentSystemLookup } from '../ports/parent-system-lookup.js';

export type UpdateModuleInput = {
  nome?: string;
  sistemaId?: string;
  status?: ModuleStatus;
};

export class UpdateModule {
  constructor(
    private readonly modules: ModuleRepository,
    private readonly systems: ParentSystemLookup,
  ) {}

  async execute(id: string, input: UpdateModuleInput): Promise<Module> {
    if (input.nome === undefined && input.sistemaId === undefined && input.status === undefined) {
      throw new EmptyModuleUpdateError();
    }
    const current = await this.modules.findById(id);
    if (!current) throw new ModuleNotFoundError();
    if (input.sistemaId !== undefined && input.sistemaId !== current.sistemaId) {
      const system = await this.systems.findById(input.sistemaId);
      if (!system) throw new ModuleSystemNotFoundError();
    }
    return this.modules.save({
      ...current,
      sistemaId: input.sistemaId ?? current.sistemaId,
      nome: input.nome === undefined ? current.nome : normalizeModuleName(input.nome),
      status: input.status ?? current.status,
    });
  }
}
