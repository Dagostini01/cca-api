import type { AccessRepository } from '../ports/access-repository.js';
import type { AccessPartyLookup } from '../ports/access-party-lookup.js';
import { CreateAccess } from '../use-cases/create-access.js';
import { GetAccess } from '../use-cases/get-access.js';
import { ListAccesses } from '../use-cases/list-accesses.js';
import { UpdateAccess } from '../use-cases/update-access.js';

export type AccessServices = {
  createAccess: CreateAccess;
  listAccesses: ListAccesses;
  getAccess: GetAccess;
  updateAccess: UpdateAccess;
};

export function createAccessServices(
  accesses: AccessRepository,
  users: AccessPartyLookup,
  profiles: AccessPartyLookup,
  systems: AccessPartyLookup,
): AccessServices {
  return {
    createAccess: new CreateAccess(accesses, users, profiles, systems),
    listAccesses: new ListAccesses(accesses),
    getAccess: new GetAccess(accesses),
    updateAccess: new UpdateAccess(accesses, users, profiles, systems),
  };
}
