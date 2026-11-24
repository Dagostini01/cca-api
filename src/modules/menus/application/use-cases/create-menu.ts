import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH, normalizeOptionalText } from '../../../../shared/catalog/text.js';
import { normalizeMenuName, type Menu, type MenuStatus } from '../../domain/menu.js';
import { MenuModuleNotFoundError } from '../../domain/menu-errors.js';
import type { MenuRepository } from '../ports/menu-repository.js';
import type { ParentModuleLookup } from '../ports/parent-module-lookup.js';

export type CreateMenuInput = {
  nome: string;
  moduloId: number;
  descricaoCurta?: string | null;
  descricaoLonga?: string | null;
  status?: MenuStatus;
};

export class CreateMenu {
  constructor(
    private readonly menus: MenuRepository,
    private readonly modules: ParentModuleLookup,
  ) {}

  async execute(input: CreateMenuInput): Promise<Menu> {
    const module = await this.modules.findById(input.moduloId);
    if (!module) throw new MenuModuleNotFoundError();
    return this.menus.add({
      moduloId: input.moduloId,
      nome: normalizeMenuName(input.nome),
      descricaoCurta: normalizeOptionalText(input.descricaoCurta, SHORT_TEXT_MAX_LENGTH),
      descricaoLonga: normalizeOptionalText(input.descricaoLonga, LONG_TEXT_MAX_LENGTH),
      status: input.status ?? 'ATIVADO',
    });
  }
}
