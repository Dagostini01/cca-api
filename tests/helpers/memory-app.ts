import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { createAuditRecorder } from '../../src/modules/audits/application/services/record-audit.js';
import { createAuthorizer } from '../../src/modules/authorization/application/services/authorize-access.js';
import type { IdentityDirectory } from '../../src/modules/users/application/ports/identity-directory.js';
import { InMemoryAuditRepository } from '../audits/in-memory-audit-repository.js';
import { testEnv } from './env.js';
import { createMemoryGraph, type MemoryGraph } from './memory-graph.js';
import { createInMemoryUserRegistrar } from '../users/in-memory-user-registrar.js';

export type MemoryAppOptions = {
  verify?: (token: string) => Promise<{ id: string }> | { id: string };
  directory?: IdentityDirectory;
  authorizer?: boolean;
  audits?: boolean;
};

export function createMemoryApp(options: MemoryAppOptions = {}): {
  app: FastifyInstance;
  graph: MemoryGraph;
  audits?: InMemoryAuditRepository;
} {
  const graph = createMemoryGraph();
  const audits = options.audits ? new InMemoryAuditRepository() : undefined;
  const app = buildApp(testEnv, {
    tokenVerifier: {
      verify: async (token) => {
        const verified = options.verify ? await options.verify(token) : { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' };
        return verified;
      },
    },
    companyRepository: graph.companies,
    systemRepository: graph.systems,
    moduleRepository: graph.modules,
    menuRepository: graph.menus,
    submenuRepository: graph.submenus,
    userRepository: graph.users,
    userRegistrar: createInMemoryUserRegistrar(graph.users, graph.accesses),
    accessRepository: graph.accesses,
    identityDirectory: options.directory,
    auditRepository: audits,
    auditRecorder: audits ? createAuditRecorder({ audits, users: graph.users }) : undefined,
    authorizer: options.authorizer ? createAuthorizer({ users: graph.users, accesses: graph.accesses }) : undefined,
    logger: false,
  });
  return { app, graph, audits };
}
