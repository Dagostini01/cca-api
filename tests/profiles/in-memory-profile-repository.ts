import { randomUUID } from 'node:crypto';
import type { NewProfile, ProfileRepository } from '../../src/modules/profiles/application/ports/profile-repository.js';
import { profileNamesConflict, type Profile } from '../../src/modules/profiles/domain/profile.js';
import { ProfileNameConflictError, ProfileNotFoundError } from '../../src/modules/profiles/domain/profile-errors.js';

function clone(profile: Profile): Profile {
  return {
    ...profile,
    criadoEm: new Date(profile.criadoEm),
    atualizadoEm: new Date(profile.atualizadoEm),
  };
}

export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, Profile>();

  async add(profile: NewProfile): Promise<Profile> {
    this.assertNameAvailable(profile.empresaId, profile.nome, null);
    const now = new Date();
    const stored: Profile = { id: randomUUID(), ...profile, criadoEm: now, atualizadoEm: now };
    this.profiles.set(stored.id, stored);
    return clone(stored);
  }

  async list(empresaId?: string): Promise<Profile[]> {
    return [...this.profiles.values()].filter((profile) => empresaId === undefined || profile.empresaId === empresaId).map(clone);
  }

  async findById(id: string): Promise<Profile | null> {
    const profile = this.profiles.get(id);
    return profile ? clone(profile) : null;
  }

  async save(profile: Profile): Promise<Profile> {
    if (!this.profiles.has(profile.id)) throw new ProfileNotFoundError();
    this.assertNameAvailable(profile.empresaId, profile.nome, profile.id);
    const stored: Profile = { ...profile, atualizadoEm: new Date() };
    this.profiles.set(profile.id, stored);
    return clone(stored);
  }

  private assertNameAvailable(empresaId: string, nome: string, ignoreId: string | null) {
    for (const profile of this.profiles.values()) {
      if (profile.empresaId === empresaId && profile.id !== ignoreId && profileNamesConflict(profile.nome, nome)) {
        throw new ProfileNameConflictError();
      }
    }
  }
}
