import type { BusinessUser, UserStatus } from '../../domain/user.js';

export type NewBusinessUser = {
  keycloakSub: string;
  nome: string;
  email: string;
  empresaId: string;
  status: UserStatus;
};

export interface UserRepository {
  add(user: NewBusinessUser): Promise<BusinessUser>;
  list(empresaId?: string): Promise<BusinessUser[]>;
  findById(id: string): Promise<BusinessUser | null>;
  findBySubject(keycloakSub: string): Promise<BusinessUser | null>;
  save(user: BusinessUser): Promise<BusinessUser>;
}
