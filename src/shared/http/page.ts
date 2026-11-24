import { z } from 'zod';

export type Page<T> = {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
};

export const catalogSearchQuerySchema = {
  q: z.string().trim().min(1).max(80).optional(),
  pagina: z.coerce.number().int().positive().optional(),
  tamanho: z.coerce.number().int().min(1).max(50).optional(),
};

export function tamanhoOf(query: { tamanho?: number }) {
  return query.tamanho ?? 20;
}

export function slicePage<T>(rows: T[], pagina: number, tamanho: number) {
  const start = (pagina - 1) * tamanho;
  return { rows: rows.slice(start, start + tamanho), total: rows.length };
}

export function textIncludes(value: string | null | undefined, q: string) {
  return (value ?? '').toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR'));
}
