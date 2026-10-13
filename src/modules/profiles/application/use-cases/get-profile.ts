import type { Profile } from '../../domain/profile.js';
import { ProfileNotFoundError } from '../../domain/profile-errors.js';
import type { ProfileRepository } from '../ports/profile-repository.js';

export class GetProfile {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(id: string): Promise<Profile> {
    const profile = await this.profiles.findById(id);
    if (!profile) throw new ProfileNotFoundError();
    return profile;
  }
}
