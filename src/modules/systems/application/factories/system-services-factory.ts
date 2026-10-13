import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { SystemRepository } from '../ports/system-repository.js';
import { CreateSystem } from '../use-cases/create-system.js';
import { GetSystem } from '../use-cases/get-system.js';
import { ListSystems } from '../use-cases/list-systems.js';
import { UpdateSystem } from '../use-cases/update-system.js';

export type SystemServices = {
  createSystem: CreateSystem;
  listSystems: ListSystems;
  getSystem: GetSystem;
  updateSystem: UpdateSystem;
};

export function createSystemServices(systems: SystemRepository, companies: ParentCompanyLookup): SystemServices {
  return {
    createSystem: new CreateSystem(systems, companies),
    listSystems: new ListSystems(systems),
    getSystem: new GetSystem(systems),
    updateSystem: new UpdateSystem(systems, companies),
  };
}
