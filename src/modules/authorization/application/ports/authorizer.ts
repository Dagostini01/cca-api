import type { ResourceKind } from '../../../permissions/domain/permission.js';

export type AuthorizationAction = 'visualizar' | 'criar' | 'editar';

export type AuthorizationTarget = {
  tipo: ResourceKind;
  id: string;
};

export interface Authorizer {
  assert(subject: string, action: AuthorizationAction, target: AuthorizationTarget): Promise<void>;
  assertCanCreateCompany(subject: string): Promise<void>;
  filter<T>(
    subject: string,
    action: AuthorizationAction,
    items: T[],
    targetOf: (item: T) => AuthorizationTarget,
  ): Promise<T[]>;
}
