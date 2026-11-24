import type { ScreenRef } from '../../domain/access.js';
import { IncoherentScreenError, SystemNotInCompanyError } from '../../domain/access-errors.js';
import { CompanyNotFoundError } from '../../../companies/domain/company-errors.js';
import { MenuNotFoundError } from '../../../menus/domain/menu-errors.js';
import { ModuleNotFoundError } from '../../../system-modules/domain/module-errors.js';
import { SubmenuNotFoundError } from '../../../submenus/domain/submenu-errors.js';
import { SystemNotFoundError } from '../../../systems/domain/system-errors.js';

export type ScreenChainLookup = {
  companies: { findById(id: number): Promise<{ id: number } | null> };
  systems: { findById(id: number): Promise<{ id: number; empresaIds: number[] } | null> };
  modules: { findById(id: number): Promise<{ id: number; sistemaId: number } | null> };
  menus: { findById(id: number): Promise<{ id: number; moduloId: number } | null> };
  submenus: { findById(id: number): Promise<{ id: number; menuId: number } | null> };
};

export type ScreenSelection = {
  empresaId: number;
  submenuId: number;
  sistemaId?: number;
  moduloId?: number;
  menuId?: number;
};

export async function resolveScreen(lookup: ScreenChainLookup, input: ScreenSelection): Promise<ScreenRef> {
  if (input.sistemaId !== undefined && input.moduloId !== undefined && input.menuId !== undefined) {
    const screen: ScreenRef = {
      empresaId: input.empresaId,
      sistemaId: input.sistemaId,
      moduloId: input.moduloId,
      menuId: input.menuId,
      submenuId: input.submenuId,
    };
    await assertCoherentScreen(lookup, screen);
    return screen;
  }
  const submenu = await lookup.submenus.findById(input.submenuId);
  if (!submenu) throw new SubmenuNotFoundError();
  const menu = await lookup.menus.findById(submenu.menuId);
  if (!menu) throw new MenuNotFoundError();
  const module = await lookup.modules.findById(menu.moduloId);
  if (!module) throw new ModuleNotFoundError();
  const system = await lookup.systems.findById(module.sistemaId);
  if (!system) throw new SystemNotFoundError();
  const screen: ScreenRef = {
    empresaId: input.empresaId,
    sistemaId: system.id,
    moduloId: module.id,
    menuId: menu.id,
    submenuId: submenu.id,
  };
  await assertCoherentScreen(lookup, screen);
  return screen;
}

export async function assertCoherentScreen(lookup: ScreenChainLookup, screen: ScreenRef): Promise<void> {
  const company = await lookup.companies.findById(screen.empresaId);
  if (!company) throw new CompanyNotFoundError();
  const system = await lookup.systems.findById(screen.sistemaId);
  if (!system) throw new SystemNotFoundError();
  const module = await lookup.modules.findById(screen.moduloId);
  if (!module) throw new ModuleNotFoundError();
  const menu = await lookup.menus.findById(screen.menuId);
  if (!menu) throw new MenuNotFoundError();
  const submenu = await lookup.submenus.findById(screen.submenuId);
  if (!submenu) throw new SubmenuNotFoundError();
  if (module.sistemaId !== system.id || menu.moduloId !== module.id || submenu.menuId !== menu.id) {
    throw new IncoherentScreenError();
  }
  if (!system.empresaIds.includes(company.id)) throw new SystemNotInCompanyError();
}
