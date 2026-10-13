import type { Module, ModuleStatus } from '../../domain/module.js';

export type NewModule = {
  sistemaId: string;
  nome: string;
  status: ModuleStatus;
};

export interface ModuleRepository {
  add(module: NewModule): Promise<Module>;
  list(sistemaId?: string): Promise<Module[]>;
  findById(id: string): Promise<Module | null>;
  save(module: Module): Promise<Module>;
}
