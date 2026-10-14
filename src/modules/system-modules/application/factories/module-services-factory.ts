import type { ModuleRepository } from '../ports/module-repository.js';
import type { ParentSystemLookup } from '../ports/parent-system-lookup.js';
import { CreateModule } from '../use-cases/create-module.js';
import { DeleteModule, type ModuleDeleteBlockers } from '../use-cases/delete-module.js';
import { GetModule } from '../use-cases/get-module.js';
import { ListModules } from '../use-cases/list-modules.js';
import { UpdateModule } from '../use-cases/update-module.js';

export type ModuleServices = {
  createModule: CreateModule;
  listModules: ListModules;
  getModule: GetModule;
  updateModule: UpdateModule;
  deleteModule: DeleteModule;
};

export function createModuleServices(modules: ModuleRepository, systems: ParentSystemLookup, blockers?: ModuleDeleteBlockers): ModuleServices {
  return {
    createModule: new CreateModule(modules, systems),
    listModules: new ListModules(modules),
    getModule: new GetModule(modules),
    updateModule: new UpdateModule(modules, systems),
    deleteModule: new DeleteModule(modules, blockers),
  };
}
