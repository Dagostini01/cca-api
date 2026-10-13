import type { ResourceKind } from '../../domain/permission.js';

export interface ChainResourceLookup {
  findOwner(kind: ResourceKind, id: string): Promise<{ empresaId: string; sistemaId: string | null } | null>;
}
