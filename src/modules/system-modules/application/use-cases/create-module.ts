import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH, normalizeOptionalText } from '../../../../shared/catalog/text.js';
import { normalizeModuleName, type Module, type ModuleStatus } from '../../domain/module.js';
import { ModuleSystemNotFoundError } from '../../domain/module-errors.js';
import type { ModuleRepository } from '../ports/module-repository.js';
import type { ParentSystemLookup } from '../ports/parent-system-lookup.js';

export type CreateModuleInput = {
  nome: string;
  sistemaId: number;
  descricaoCurta?: string | null;
  descricaoLonga?: string | null;
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
      descricaoCurta: normalizeOptionalText(input.descricaoCurta, SHORT_TEXT_MAX_LENGTH),
      descricaoLonga: normalizeOptionalText(input.descricaoLonga, LONG_TEXT_MAX_LENGTH),
      status: input.status ?? 'ATIVADO',
    });
  }
}
