import { z } from 'zod';

const statusId = z.number().int().positive().nullable();

const legacyNodeSchema = z.object({
  id: z.number().int().positive(),
  parentId: z.number().int().positive().nullable(),
  nome: z.string(),
  statusId,
}).strict();

const countsSchema = z.object({
  criadas: z.number().int(),
  existentes: z.number().int(),
  ignoradas: z.number().int(),
});

export const importLegacyBodySchema = z.object({
  statuses: z.array(z.object({ id: z.number().int().positive(), nome: z.string() }).strict()),
  companies: z.array(z.object({
    id: z.number().int().positive(),
    nome: z.string(),
    cnpj: z.string().nullable(),
    statusId,
  }).strict()),
  systems: z.array(legacyNodeSchema),
  modules: z.array(legacyNodeSchema),
  menus: z.array(legacyNodeSchema),
  submenus: z.array(legacyNodeSchema),
  profiles: z.array(z.object({
    id: z.number().int().positive(),
    nome: z.string(),
    statusId,
  }).strict()),
  users: z.array(z.object({
    nome: z.string(),
    email: z.string().nullable(),
    statusId,
    perfilId: z.number().int().positive().nullable(),
  }).strict()),
  accesses: z.array(z.object({
    email: z.string().nullable(),
    empresaId: z.number().int().positive().nullable(),
    sistemaId: z.number().int().positive().nullable(),
    submenuId: z.number().int().positive().nullable(),
    perfilId: z.number().int().positive().nullable(),
    statusId,
  }).strict()),
  senhasIgnoradas: z.number().int().nonnegative().optional(),
  vinculos: z.array(z.object({
    email: z.string().trim().email(),
    keycloakSub: z.string().uuid(),
  }).strict()).optional(),
}).strict();

export const legacyImportReportSchema = z.object({
  empresas: countsSchema,
  sistemas: countsSchema,
  modulos: countsSchema,
  menus: countsSchema,
  submenus: countsSchema,
  perfis: countsSchema,
  usuarios: countsSchema,
  permissoes: countsSchema,
  acessos: countsSchema,
  documentosIgnorados: z.number().int(),
  senhasIgnoradas: z.number().int(),
});
