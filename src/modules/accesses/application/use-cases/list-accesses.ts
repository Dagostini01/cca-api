import type { Page } from '../../../../shared/http/page.js';
import type { ScreenAccessView } from '../../domain/access.js';
import type { AccessRepository, ScreenPageQuery } from '../ports/access-repository.js';

export class ListAccesses {
  constructor(private readonly accesses: AccessRepository) {}

  async execute(query: ScreenPageQuery): Promise<Page<ScreenAccessView>> {
    const { rows, total } = await this.accesses.pageViews(query);
    return { itens: rows, total, pagina: query.pagina, tamanho: query.tamanho };
  }
}
