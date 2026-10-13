import { normalizeProfileDescription, normalizeProfileName, type Profile, type ProfileStatus } from '../../domain/profile.js';
import { EmptyProfileUpdateError, ProfileCompanyNotFoundError, ProfileNotFoundError } from '../../domain/profile-errors.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { ProfileRepository } from '../ports/profile-repository.js';

export type UpdateProfileInput = {
  nome?: string;
  descricao?: string | null;
  empresaId?: string;
  status?: ProfileStatus;
};

export class UpdateProfile {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly companies: ParentCompanyLookup,
  ) {}

  async execute(id: string, input: UpdateProfileInput): Promise<Profile> {
    if (input.nome === undefined && input.descricao === undefined && input.empresaId === undefined && input.status === undefined) {
      throw new EmptyProfileUpdateError();
    }
    const current = await this.profiles.findById(id);
    if (!current) throw new ProfileNotFoundError();
    if (input.empresaId !== undefined && input.empresaId !== current.empresaId) {
      const company = await this.companies.findById(input.empresaId);
      if (!company) throw new ProfileCompanyNotFoundError();
    }
    return this.profiles.save({
      ...current,
      empresaId: input.empresaId ?? current.empresaId,
      nome: input.nome === undefined ? current.nome : normalizeProfileName(input.nome),
      descricao: input.descricao === undefined ? current.descricao : normalizeProfileDescription(input.descricao),
      status: input.status ?? current.status,
    });
  }
}
