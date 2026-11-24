import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH, normalizeOptionalText } from '../../../../shared/catalog/text.js';
import { normalizeSubmenuName, type Submenu, type SubmenuStatus } from '../../domain/submenu.js';
import { SubmenuMenuNotFoundError } from '../../domain/submenu-errors.js';
import type { ParentMenuLookup } from '../ports/parent-menu-lookup.js';
import type { SubmenuRepository } from '../ports/submenu-repository.js';

export type CreateSubmenuInput = {
  nome: string;
  menuId: number;
  descricaoCurta?: string | null;
  descricaoLonga?: string | null;
  status?: SubmenuStatus;
};

export class CreateSubmenu {
  constructor(
    private readonly submenus: SubmenuRepository,
    private readonly menus: ParentMenuLookup,
  ) {}

  async execute(input: CreateSubmenuInput): Promise<Submenu> {
    const menu = await this.menus.findById(input.menuId);
    if (!menu) throw new SubmenuMenuNotFoundError();
    return this.submenus.add({
      menuId: input.menuId,
      nome: normalizeSubmenuName(input.nome),
      descricaoCurta: normalizeOptionalText(input.descricaoCurta, SHORT_TEXT_MAX_LENGTH),
      descricaoLonga: normalizeOptionalText(input.descricaoLonga, LONG_TEXT_MAX_LENGTH),
      status: input.status ?? 'ATIVADO',
    });
  }
}
