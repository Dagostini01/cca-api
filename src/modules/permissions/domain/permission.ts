import { InvalidPermissionActionsError } from './permission-errors.js';

export const RESOURCE_KINDS = ['EMPRESA', 'SISTEMA', 'MODULO', 'MENU', 'SUBMENU'] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export type PermissionActions = {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
};

export type Permission = PermissionActions & {
  id: string;
  perfilId: string;
  recursoTipo: ResourceKind;
  recursoId: string;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function assertGrantedActions(actions: PermissionActions): PermissionActions {
  if (!actions.visualizar && !actions.criar && !actions.editar && !actions.excluir) {
    throw new InvalidPermissionActionsError();
  }
  return actions;
}
