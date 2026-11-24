import type { System, SystemStatus } from '../../domain/system.js';

export type NewSystem = {
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  status: SystemStatus;
  empresaIds?: number[];
};

export type SystemListFilter = {
  empresaId?: number;
  q?: string;
};

export type SystemPageQuery = SystemListFilter & {
  pagina: number;
  tamanho: number;
};

export interface SystemRepository {
  add(system: NewSystem): Promise<System>;
  list(filter?: SystemListFilter): Promise<System[]>;
  page(query: SystemPageQuery): Promise<{ rows: System[]; total: number }>;
  findById(id: number): Promise<System | null>;
  save(system: System): Promise<System>;
  remove(id: number): Promise<void>;
  linkCompany(sistemaId: number, empresaId: number): Promise<void>;
}
