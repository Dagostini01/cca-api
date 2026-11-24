import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH, normalizeOptionalText } from '../../../../shared/catalog/text.js';
import { normalizeSystemName, type System, type SystemStatus } from '../../domain/system.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { SystemRepository } from '../ports/system-repository.js';
import { resolveCompanyIds } from './system-companies.js';

export type CreateSystemInput = {
  nome: string;
  descricaoCurta?: string | null;
  descricaoLonga?: string | null;
  status?: SystemStatus;
  empresaIds?: number[];
};

export class CreateSystem {
  constructor(private readonly systems: SystemRepository, private readonly companies?: ParentCompanyLookup) {}

  async execute(input: CreateSystemInput): Promise<System> {
    const nome = normalizeSystemName(input.nome);
    const empresaIds = await resolveCompanyIds(input.empresaIds ?? [], this.companies);
    return this.systems.add({
      nome,
      descricaoCurta: normalizeOptionalText(input.descricaoCurta, SHORT_TEXT_MAX_LENGTH),
      descricaoLonga: normalizeOptionalText(input.descricaoLonga, LONG_TEXT_MAX_LENGTH),
      status: input.status ?? 'ATIVADO',
      empresaIds,
    });
  }
}
