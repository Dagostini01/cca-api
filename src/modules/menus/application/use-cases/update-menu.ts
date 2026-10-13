import { normalizeMenuName, type Menu, type MenuStatus } from '../../domain/menu.js';
import { EmptyMenuUpdateError, MenuModuleNotFoundError, MenuNotFoundError } from '../../domain/menu-errors.js';
import type { MenuRepository } from '../ports/menu-repository.js';
import type { ParentModuleLookup } from '../ports/parent-module-lookup.js';

export type UpdateMenuInput = {
  nome?: string;
  moduloId?: string;
  status?: MenuStatus;
};

export class UpdateMenu {
  constructor(
    private readonly menus: MenuRepository,
    private readonly modules: ParentModuleLookup,
  ) {}

  async execute(id: string, input: UpdateMenuInput): Promise<Menu> {
    if (input.nome === undefined && input.moduloId === undefined && input.status === undefined) {
      throw new EmptyMenuUpdateError();
    }
    const current = await this.menus.findById(id);
    if (!current) throw new MenuNotFoundError();
    if (input.moduloId !== undefined && input.moduloId !== current.moduloId) {
      const module = await this.modules.findById(input.moduloId);
      if (!module) throw new MenuModuleNotFoundError();
    }
    return this.menus.save({
      ...current,
      moduloId: input.moduloId ?? current.moduloId,
      nome: input.nome === undefined ? current.nome : normalizeMenuName(input.nome),
      status: input.status ?? current.status,
    });
  }
}
