import type { ChainResourceLookup } from '../ports/chain-resource-lookup.js';

export interface OwnedCompanyLookup {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface OwnedSystemLookup {
  findById(id: string): Promise<{ id: string; empresaId: string } | null>;
}

export interface OwnedModuleLookup {
  findById(id: string): Promise<{ sistemaId: string } | null>;
}

export interface OwnedMenuLookup {
  findById(id: string): Promise<{ moduloId: string } | null>;
}

export interface OwnedSubmenuLookup {
  findById(id: string): Promise<{ menuId: string } | null>;
}

export function createWalkingChainResourceLookup(
  companies: OwnedCompanyLookup,
  systems: OwnedSystemLookup,
  modules: OwnedModuleLookup,
  menus: OwnedMenuLookup,
  submenus: OwnedSubmenuLookup,
): ChainResourceLookup {
  return {
    async findOwner(kind, id) {
      if (kind === 'EMPRESA') {
        const company = await companies.findById(id);
        return company ? { empresaId: company.id, sistemaId: null } : null;
      }
      if (kind === 'SISTEMA') {
        const system = await systems.findById(id);
        return system ? { empresaId: system.empresaId, sistemaId: system.id } : null;
      }
      if (kind === 'MODULO') {
        const module = await modules.findById(id);
        if (!module) return null;
        const system = await systems.findById(module.sistemaId);
        return system ? { empresaId: system.empresaId, sistemaId: system.id } : null;
      }
      if (kind === 'MENU') {
        const menu = await menus.findById(id);
        if (!menu) return null;
        const module = await modules.findById(menu.moduloId);
        if (!module) return null;
        const system = await systems.findById(module.sistemaId);
        return system ? { empresaId: system.empresaId, sistemaId: system.id } : null;
      }
      const submenu = await submenus.findById(id);
      if (!submenu) return null;
      const menu = await menus.findById(submenu.menuId);
      if (!menu) return null;
      const module = await modules.findById(menu.moduloId);
      if (!module) return null;
      const system = await systems.findById(module.sistemaId);
      return system ? { empresaId: system.empresaId, sistemaId: system.id } : null;
    },
  };
}
