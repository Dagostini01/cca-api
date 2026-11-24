import type { ScreenChainLookup } from '../services/screen-chain.js';
import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import type { AccessRepository } from '../ports/access-repository.js';
import { CreateAccess } from '../use-cases/create-access.js';
import { DeleteAccess } from '../use-cases/delete-access.js';
import { GetAccess } from '../use-cases/get-access.js';
import { ListAccesses } from '../use-cases/list-accesses.js';
import { UpdateAccess } from '../use-cases/update-access.js';

export type AccessServices = {
  createAccess: CreateAccess;
  listAccesses: ListAccesses;
  getAccess: GetAccess;
  updateAccess: UpdateAccess;
  deleteAccess: DeleteAccess;
};

export function createAccessServices(
  accesses: AccessRepository,
  users: UserRepository,
  chain: ScreenChainLookup,
): AccessServices {
  return {
    createAccess: new CreateAccess(accesses, users, chain),
    listAccesses: new ListAccesses(accesses),
    getAccess: new GetAccess(accesses),
    updateAccess: new UpdateAccess(accesses),
    deleteAccess: new DeleteAccess(accesses),
  };
}
