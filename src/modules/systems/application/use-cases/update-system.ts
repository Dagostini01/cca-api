import { normalizeSystemName, type System, type SystemStatus } from '../../domain/system.js';
import { EmptySystemUpdateError, SystemCompanyNotFoundError, SystemNotFoundError } from '../../domain/system-errors.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { SystemRepository } from '../ports/system-repository.js';

export type UpdateSystemInput = {
  nome?: string;
  empresaId?: string;
  status?: SystemStatus;
};

export class UpdateSystem {
  constructor(
    private readonly systems: SystemRepository,
    private readonly companies: ParentCompanyLookup,
  ) {}

  async execute(id: string, input: UpdateSystemInput): Promise<System> {
    if (input.nome === undefined && input.empresaId === undefined && input.status === undefined) {
      throw new EmptySystemUpdateError();
    }
    const current = await this.systems.findById(id);
    if (!current) throw new SystemNotFoundError();
    if (input.empresaId !== undefined && input.empresaId !== current.empresaId) {
      const company = await this.companies.findById(input.empresaId);
      if (!company) throw new SystemCompanyNotFoundError();
    }
    return this.systems.save({
      ...current,
      empresaId: input.empresaId ?? current.empresaId,
      nome: input.nome === undefined ? current.nome : normalizeSystemName(input.nome),
      status: input.status ?? current.status,
    });
  }
}
