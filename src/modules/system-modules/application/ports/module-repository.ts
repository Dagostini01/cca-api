import type { Module, ModuleStatus } from '../../domain/module.js';

export type NewModule = {
  sistemaId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  status: ModuleStatus;
};

export type ModuleListFilter = {
  sistemaId?: number;
  q?: string;
};

export type ModulePageQuery = ModuleListFilter & {
  pagina: number;
  tamanho: number;
};

export interface ModuleRepository {
  add(module: NewModule): Promise<Module>;
  list(filter?: ModuleListFilter): Promise<Module[]>;
  page(query: ModulePageQuery): Promise<{ rows: Module[]; total: number }>;
  findById(id: number): Promise<Module | null>;
  save(module: Module): Promise<Module>;
  remove(id: number): Promise<void>;
}
