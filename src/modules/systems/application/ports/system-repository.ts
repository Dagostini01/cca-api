import type { System, SystemStatus } from '../../domain/system.js';

export type NewSystem = {
  empresaId: string;
  nome: string;
  status: SystemStatus;
};

export interface SystemRepository {
  add(system: NewSystem): Promise<System>;
  list(empresaId?: string): Promise<System[]>;
  findById(id: string): Promise<System | null>;
  save(system: System): Promise<System>;
}
