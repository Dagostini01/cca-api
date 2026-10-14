import type { IdentityDirectory } from '../ports/identity-directory.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { UserRepository } from '../ports/user-repository.js';
import { CreateUser } from '../use-cases/create-user.js';
import { DeleteUser, type UserDeleteBlockers } from '../use-cases/delete-user.js';
import { GetUser } from '../use-cases/get-user.js';
import { GetUserBySubject } from '../use-cases/get-user-by-subject.js';
import { ListUsers } from '../use-cases/list-users.js';
import { UpdateUser } from '../use-cases/update-user.js';

export type UserServices = {
  createUser: CreateUser;
  listUsers: ListUsers;
  getUser: GetUser;
  getUserBySubject: GetUserBySubject;
  updateUser: UpdateUser;
  deleteUser: DeleteUser;
};

export function createUserServices(
  users: UserRepository,
  companies: ParentCompanyLookup,
  directory?: IdentityDirectory,
  blockers?: UserDeleteBlockers,
): UserServices {
  return {
    createUser: new CreateUser(users, companies, directory),
    listUsers: new ListUsers(users),
    getUser: new GetUser(users),
    getUserBySubject: new GetUserBySubject(users),
    updateUser: new UpdateUser(users, companies, directory),
    deleteUser: new DeleteUser(users, blockers),
  };
}
