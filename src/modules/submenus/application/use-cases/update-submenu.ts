import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH, normalizeOptionalText } from '../../../../shared/catalog/text.js';
import { normalizeSubmenuName, type Submenu, type SubmenuStatus } from '../../domain/submenu.js';
import { EmptySubmenuUpdateError, SubmenuMenuNotFoundError, SubmenuNotFoundError } from '../../domain/submenu-errors.js';
import type { ParentMenuLookup } from '../ports/parent-menu-lookup.js';
import type { SubmenuRepository } from '../ports/submenu-repository.js';

export type UpdateSubmenuInput = {
  nome?: string;
  menuId?: number;
  descricaoCurta?: string | null;
  descricaoLonga?: string | null;
  status?: SubmenuStatus;
};

export class UpdateSubmenu {
  constructor(
    private readonly submenus: SubmenuRepository,
    private readonly menus: ParentMenuLookup,
  ) {}

  async execute(id: number, input: UpdateSubmenuInput): Promise<Submenu> {
    if (
      input.nome === undefined
      && input.menuId === undefined
      && input.descricaoCurta === undefined
      && input.descricaoLonga === undefined
      && input.status === undefined
    ) {
      throw new EmptySubmenuUpdateError();
    }
    const current = await this.submenus.findById(id);
    if (!current) throw new SubmenuNotFoundError();
    if (input.menuId !== undefined && input.menuId !== current.menuId) {
      const menu = await this.menus.findById(input.menuId);
      if (!menu) throw new SubmenuMenuNotFoundError();
    }
    return this.submenus.save({
      ...current,
      menuId: input.menuId ?? current.menuId,
      nome: input.nome === undefined ? current.nome : normalizeSubmenuName(input.nome),
      descricaoCurta: input.descricaoCurta === undefined ? current.descricaoCurta : normalizeOptionalText(input.descricaoCurta, SHORT_TEXT_MAX_LENGTH),
      descricaoLonga: input.descricaoLonga === undefined ? current.descricaoLonga : normalizeOptionalText(input.descricaoLonga, LONG_TEXT_MAX_LENGTH),
      status: input.status ?? current.status,
    });
  }
}
