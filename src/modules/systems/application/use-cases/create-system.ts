import { normalizeSystemName, type System, type SystemStatus } from '../../domain/system.js';
import { SystemCompanyNotFoundError } from '../../domain/system-errors.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { SystemRepository } from '../ports/system-repository.js';

export type CreateSystemInput = {
  nome: string;
  empresaId: string;
  status?: SystemStatus;
};

export class CreateSystem {
  constructor(
    private readonly systems: SystemRepository,
    private readonly companies: ParentCompanyLookup,
  ) {}

  async execute(input: CreateSystemInput): Promise<System> {
    const company = await this.companies.findById(input.empresaId);
    if (!company) throw new SystemCompanyNotFoundError();
    return this.systems.add({
      empresaId: input.empresaId,
      nome: normalizeSystemName(input.nome),
      status: input.status ?? 'ATIVO',
    });
  }
}
