import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH, normalizeOptionalText } from '../../../../shared/catalog/text.js';
import { normalizeSystemName, type System, type SystemStatus } from '../../domain/system.js';
import { EmptySystemUpdateError, SystemCompanyInUseError, SystemNotFoundError } from '../../domain/system-errors.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { SystemRepository } from '../ports/system-repository.js';
import { resolveCompanyIds } from './system-companies.js';

export type UpdateSystemInput = {
  nome?: string;
  descricaoCurta?: string | null;
  descricaoLonga?: string | null;
  status?: SystemStatus;
  empresaIds?: number[];
};

export type UpdateSystemDependencies = {
  companies?: ParentCompanyLookup;
  accesses?: AccessRepository;
};

export class UpdateSystem {
  constructor(private readonly systems: SystemRepository, private readonly dependencies: UpdateSystemDependencies = {}) {}

  async execute(id: number, input: UpdateSystemInput): Promise<System> {
    if (Object.values(input).every((value) => value === undefined)) throw new EmptySystemUpdateError();
    const current = await this.systems.findById(id);
    if (!current) throw new SystemNotFoundError();
    const empresaIds = input.empresaIds === undefined
      ? current.empresaIds
      : await resolveCompanyIds(input.empresaIds, this.dependencies.companies);
    for (const removed of current.empresaIds.filter((empresaId) => !empresaIds.includes(empresaId))) {
      if ((await this.dependencies.accesses?.list({ sistemaId: id, empresaId: removed }))?.length) throw new SystemCompanyInUseError();
    }
    return this.systems.save({
      ...current,
      nome: input.nome === undefined ? current.nome : normalizeSystemName(input.nome),
      descricaoCurta: input.descricaoCurta === undefined ? current.descricaoCurta : normalizeOptionalText(input.descricaoCurta, SHORT_TEXT_MAX_LENGTH),
      descricaoLonga: input.descricaoLonga === undefined ? current.descricaoLonga : normalizeOptionalText(input.descricaoLonga, LONG_TEXT_MAX_LENGTH),
      status: input.status ?? current.status,
      empresaIds,
    });
  }
}
