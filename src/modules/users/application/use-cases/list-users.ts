import type { Page } from '../../../../shared/http/page.js';
import type { BusinessUser } from '../../domain/user.js';
import type { UserPageQuery, UserRepository } from '../ports/user-repository.js';

export class ListUsers {
  constructor(private readonly users: UserRepository) {}

  async execute(subject: string, query: UserPageQuery): Promise<Page<BusinessUser>> {
    const actor = await this.users.findBySubject(subject);
    if (!actor) return { itens: [], total: 0, pagina: query.pagina, tamanho: query.tamanho };
    const { rows, total } = await this.users.pageByCreator(actor.id, query);
    return { itens: rows, total, pagina: query.pagina, tamanho: query.tamanho };
  }
}
