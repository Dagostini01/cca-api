import { normalizeProfileDescription, normalizeProfileName, type Profile, type ProfileStatus } from '../../domain/profile.js';
import { ProfileCompanyNotFoundError } from '../../domain/profile-errors.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { ProfileRepository } from '../ports/profile-repository.js';

export type CreateProfileInput = {
  nome: string;
  descricao?: string | null;
  empresaId: string;
  status?: ProfileStatus;
};

export class CreateProfile {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly companies: ParentCompanyLookup,
  ) {}

  async execute(input: CreateProfileInput): Promise<Profile> {
    const company = await this.companies.findById(input.empresaId);
    if (!company) throw new ProfileCompanyNotFoundError();
    return this.profiles.add({
      empresaId: input.empresaId,
      nome: normalizeProfileName(input.nome),
      descricao: normalizeProfileDescription(input.descricao ?? null),
      status: input.status ?? 'ATIVO',
    });
  }
}
