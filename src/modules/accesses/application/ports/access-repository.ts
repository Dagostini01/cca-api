import type { Access, AccessStatus } from '../../domain/access.js';

export type NewAccess = {
  usuarioId: string;
  perfilId: string;
  sistemaId: string;
  status: AccessStatus;
};

export type AccessListFilter = {
  usuarioId?: string;
  sistemaId?: string;
};

export interface AccessRepository {
  add(access: NewAccess): Promise<Access>;
  list(filter?: AccessListFilter): Promise<Access[]>;
  count(): Promise<number>;
  findById(id: string): Promise<Access | null>;
  save(access: Access): Promise<Access>;
}
