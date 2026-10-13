import type { Profile } from '../../domain/profile.js';
import type { ProfileRepository } from '../ports/profile-repository.js';

export class ListProfiles {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(filter: { empresaId?: string } = {}): Promise<Profile[]> {
    const profiles = await this.profiles.list(filter.empresaId);
    return [...profiles].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.empresaId.localeCompare(right.empresaId));
  }
}
