import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { ScreenChainLookup } from '../../../accesses/application/services/screen-chain.js';
import type { MenuRepository } from '../../../menus/application/ports/menu-repository.js';
import type { ModuleRepository } from '../../../system-modules/application/ports/module-repository.js';
import type { SubmenuRepository } from '../../../submenus/application/ports/submenu-repository.js';
import type { SystemRepository } from '../../../systems/application/ports/system-repository.js';
import type { IdentityDirectory } from '../ports/identity-directory.js';
import type { UserRegistrar } from '../ports/user-registrar.js';
import type { UserRepository } from '../ports/user-repository.js';
import { CreateUser } from '../use-cases/create-user.js';
import { DeleteUser, type UserDeleteBlockers } from '../use-cases/delete-user.js';
import { GetUser } from '../use-cases/get-user.js';
import { GetUserBySubject } from '../use-cases/get-user-by-subject.js';
import { IssueAccessCode } from '../use-cases/issue-access-code.js';
import { ListUserScreens } from '../use-cases/list-user-screens.js';
import { ListUsers } from '../use-cases/list-users.js';
import { UpdateUser } from '../use-cases/update-user.js';

export type UserServices = {
  createUser: CreateUser;
  listUsers: ListUsers;
  getUser: GetUser;
  getUserBySubject: GetUserBySubject;
  updateUser: UpdateUser;
  deleteUser: DeleteUser;
  listUserScreens: ListUserScreens;
  issueAccessCode: IssueAccessCode;
};

export function createUserServices(dependencies: {
  users: UserRepository;
  accesses: AccessRepository;
  registrar: UserRegistrar;
  chain: ScreenChainLookup;
  systems: SystemRepository;
  modules: ModuleRepository;
  menus: MenuRepository;
  submenus: SubmenuRepository;
  directory?: IdentityDirectory;
  blockers?: UserDeleteBlockers;
}): UserServices {
  return {
    createUser: new CreateUser(dependencies.users, dependencies.registrar, dependencies.chain, dependencies.directory),
    listUsers: new ListUsers(dependencies.users),
    getUser: new GetUser(dependencies.users),
    getUserBySubject: new GetUserBySubject(dependencies.users),
    updateUser: new UpdateUser(dependencies.users, dependencies.accesses, dependencies.chain, dependencies.directory),
    deleteUser: new DeleteUser(dependencies.users, dependencies.blockers),
    listUserScreens: new ListUserScreens(dependencies.accesses),
    issueAccessCode: new IssueAccessCode(dependencies.directory),
  };
}
