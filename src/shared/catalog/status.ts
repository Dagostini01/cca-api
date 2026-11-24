export const CATALOG_STATUSES = ['ATIVADO', 'DESATIVADO'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export const USER_TYPES = ['ADMINITRADOR', 'SUPERVISOR'] as const;
export type UserType = (typeof USER_TYPES)[number];

export const ACTIVATED_STATUS_ID = 1;
export const DEACTIVATED_STATUS_ID = 2;
export const ADMINISTRATOR_TYPE_ID = 1;
export const SUPERVISOR_TYPE_ID = 2;

export function statusIdOf(status: CatalogStatus): number {
  return status === 'DESATIVADO' ? DEACTIVATED_STATUS_ID : ACTIVATED_STATUS_ID;
}

export function statusOf(id: number | null | undefined): CatalogStatus {
  return id === DEACTIVATED_STATUS_ID ? 'DESATIVADO' : 'ATIVADO';
}

export function userTypeIdOf(tipo: UserType): number {
  return tipo === 'SUPERVISOR' ? SUPERVISOR_TYPE_ID : ADMINISTRATOR_TYPE_ID;
}

export function userTypeOf(id: number | null | undefined): UserType {
  return id === SUPERVISOR_TYPE_ID ? 'SUPERVISOR' : 'ADMINITRADOR';
}
