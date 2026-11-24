import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH, normalizeOptionalText } from '../../../../shared/catalog/text.js';
import { normalizeModuleName, type Module, type ModuleStatus } from '../../domain/module.js';
import { EmptyModuleUpdateError, ModuleNotFoundError, ModuleSystemNotFoundError } from '../../domain/module-errors.js';
import type { ModuleRepository } from '../ports/module-repository.js';
import type { ParentSystemLookup } from '../ports/parent-system-lookup.js';

export type UpdateModuleInput = {
  nome?: string;
  sistemaId?: number;
  descricaoCurta?: string | null;
  descricaoLonga?: string | null;
  status?: ModuleStatus;
};

export class UpdateModule {
  constructor(
    private readonly modules: ModuleRepository,
    private readonly systems: ParentSystemLookup,
  ) {}

  async execute(id: number, input: UpdateModuleInput): Promise<Module> {
    if (
      input.nome === undefined
      && input.sistemaId === undefined
      && input.descricaoCurta === undefined
      && input.descricaoLonga === undefined
      && input.status === undefined
    ) {
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
      descricaoCurta: input.descricaoCurta === undefined ? current.descricaoCurta : normalizeOptionalText(input.descricaoCurta, SHORT_TEXT_MAX_LENGTH),
      descricaoLonga: input.descricaoLonga === undefined ? current.descricaoLonga : normalizeOptionalText(input.descricaoLonga, LONG_TEXT_MAX_LENGTH),
      status: input.status ?? current.status,
    });
  }
}
