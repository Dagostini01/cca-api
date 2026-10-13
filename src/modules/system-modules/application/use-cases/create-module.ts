import { normalizeModuleName, type Module, type ModuleStatus } from '../../domain/module.js';
import { ModuleSystemNotFoundError } from '../../domain/module-errors.js';
import type { ModuleRepository } from '../ports/module-repository.js';
import type { ParentSystemLookup } from '../ports/parent-system-lookup.js';

export type CreateModuleInput = {
  nome: string;
  sistemaId: string;
  status?: ModuleStatus;
};

export class CreateModule {
  constructor(
    private readonly modules: ModuleRepository,
    private readonly systems: ParentSystemLookup,
  ) {}

  async execute(input: CreateModuleInput): Promise<Module> {
    const system = await this.systems.findById(input.sistemaId);
    if (!system) throw new ModuleSystemNotFoundError();
    return this.modules.add({
      sistemaId: input.sistemaId,
      nome: normalizeModuleName(input.nome),
      status: input.status ?? 'ATIVO',
    });
  }
}
