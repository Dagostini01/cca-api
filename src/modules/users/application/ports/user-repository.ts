import type { UserType } from '../../../../shared/catalog/status.js';
import type { BusinessUser, UserStatus } from '../../domain/user.js';

export type UserPageQuery = {
  q?: string;
  tipo?: UserType;
  status?: UserStatus;
  pagina: number;
  tamanho: number;
};

export type NewBusinessUser = {
  keycloakSub: string | null;
  nome: string;
  sobrenome: string | null;
  apelido: string | null;
  rg: string | null;
  cpf: string | null;
  email: string | null;
  celular: string | null;
  tipo: UserType;
  status: UserStatus;
  criadoPorId: number | null;
};

export interface UserRepository {
  add(user: NewBusinessUser): Promise<BusinessUser>;
  listByCreator(criadoPorId: number): Promise<BusinessUser[]>;
  pageByCreator(criadoPorId: number, query: UserPageQuery): Promise<{ rows: BusinessUser[]; total: number }>;
  countByType(tipo: UserType): Promise<number>;
  findById(id: number): Promise<BusinessUser | null>;
  findBySubject(keycloakSub: string): Promise<BusinessUser | null>;
  findByEmail(email: string): Promise<BusinessUser | null>;
  save(user: BusinessUser): Promise<BusinessUser>;
  remove(id: number): Promise<void>;
}
