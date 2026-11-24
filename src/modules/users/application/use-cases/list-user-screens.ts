import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { ScreenView } from '../../../accesses/domain/access.js';

export class ListUserScreens {
  constructor(private readonly accesses: AccessRepository) {}

  async execute(usuarioId: number): Promise<ScreenView[]> {
    const grants = (await this.accesses.listViews({ usuarioId })).filter((grant) => grant.status === 'ATIVADO');
    const views: ScreenView[] = [];
    const seen = new Set<number>();
    for (const grant of grants) {
      if (seen.has(grant.submenuId)) continue;
      seen.add(grant.submenuId);
      views.push({
        sistemaId: grant.sistemaId,
        sistema: grant.sistema,
        moduloId: grant.moduloId,
        modulo: grant.modulo,
        menuId: grant.menuId,
        menu: grant.menu,
        submenuId: grant.submenuId,
        submenu: grant.submenu,
      });
    }
    return views.sort((left, right) => (
      left.sistema.localeCompare(right.sistema, 'pt-BR')
      || left.modulo.localeCompare(right.modulo, 'pt-BR')
      || left.menu.localeCompare(right.menu, 'pt-BR')
      || left.submenu.localeCompare(right.submenu, 'pt-BR')
    ));
  }
}
