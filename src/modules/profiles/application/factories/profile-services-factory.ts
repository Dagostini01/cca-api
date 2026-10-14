import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { ProfileRepository } from '../ports/profile-repository.js';
import { CreateProfile } from '../use-cases/create-profile.js';
import { DeleteProfile, type ProfileDeleteBlockers } from '../use-cases/delete-profile.js';
import { GetProfile } from '../use-cases/get-profile.js';
import { ListProfiles } from '../use-cases/list-profiles.js';
import { UpdateProfile } from '../use-cases/update-profile.js';

export type ProfileServices = {
  createProfile: CreateProfile;
  listProfiles: ListProfiles;
  getProfile: GetProfile;
  updateProfile: UpdateProfile;
  deleteProfile: DeleteProfile;
};

export function createProfileServices(profiles: ProfileRepository, companies: ParentCompanyLookup, blockers?: ProfileDeleteBlockers): ProfileServices {
  return {
    createProfile: new CreateProfile(profiles, companies),
    listProfiles: new ListProfiles(profiles),
    getProfile: new GetProfile(profiles),
    updateProfile: new UpdateProfile(profiles, companies),
    deleteProfile: new DeleteProfile(profiles, blockers),
  };
}
