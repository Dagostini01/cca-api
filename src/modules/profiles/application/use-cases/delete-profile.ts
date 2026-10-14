import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { PermissionRepository } from '../../../permissions/application/ports/permission-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { Profile } from '../../domain/profile.js';
import { ProfileNotFoundError } from '../../domain/profile-errors.js';
import type { ProfileRepository } from '../ports/profile-repository.js';

export type ProfileDeleteBlockers = {
  permissions?: PermissionRepository;
  accesses?: AccessRepository;
};

export class DeleteProfile {
  constructor(private readonly profiles: ProfileRepository, private readonly blockers: ProfileDeleteBlockers = {}) {}

  async execute(id: string): Promise<Profile> {
    const profile = await this.ensureDeletable(id);
    await this.profiles.remove(id);
    return profile;
  }

  async ensureDeletable(id: string): Promise<Profile> {
    const profile = await this.profiles.findById(id);
    if (!profile) throw new ProfileNotFoundError();
    if ((await this.blockers.permissions?.list(id))?.length) throw new DeleteRestrictedError();
    if ((await this.blockers.accesses?.list())?.some((access) => access.perfilId === id)) throw new DeleteRestrictedError();
    return profile;
  }
}
