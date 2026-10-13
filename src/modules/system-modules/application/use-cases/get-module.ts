import type { Module } from '../../domain/module.js';
import { ModuleNotFoundError } from '../../domain/module-errors.js';
import type { ModuleRepository } from '../ports/module-repository.js';

export class GetModule {
  constructor(private readonly modules: ModuleRepository) {}

  async execute(id: string): Promise<Module> {
    const module = await this.modules.findById(id);
    if (!module) throw new ModuleNotFoundError();
    return module;
  }
}
