export type AccessStatus = 'ATIVO' | 'INATIVO';

export type Access = {
  id: string;
  usuarioId: string;
  perfilId: string;
  sistemaId: string;
  status: AccessStatus;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function sameCompany(left: string, middle: string, right: string): boolean {
  return left === middle && left === right;
}
