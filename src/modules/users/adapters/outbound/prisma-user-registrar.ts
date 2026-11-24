import { Prisma, PrismaClient } from '@prisma/client';
import { statusIdOf, userTypeIdOf } from '../../../../shared/catalog/status.js';
import type { ScreenDraft } from '../../../accesses/application/ports/access-repository.js';
import { AccessConflictError } from '../../../accesses/domain/access-errors.js';
import type { UserRegistrar } from '../../application/ports/user-registrar.js';
import type { NewBusinessUser } from '../../application/ports/user-repository.js';
import type { BusinessUser } from '../../domain/user.js';
import { UserEmailConflictError, UserSubjectConflictError } from '../../domain/user-errors.js';
import { toUser, userWriteData } from './prisma-user-repository.js';

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '').toLowerCase();
      if (target.includes('email')) throw new UserEmailConflictError();
      if (target.includes('sub_menu') || target.includes('submenu')) throw new AccessConflictError();
      throw new UserSubjectConflictError();
    }
  }
  throw error;
}

export function createPrismaUserRegistrar(prisma: PrismaClient): UserRegistrar {
  return {
    async register(user: NewBusinessUser, screens: ScreenDraft[]): Promise<BusinessUser> {
      try {
        const row = await prisma.$transaction(async (tx) => {
          const created = await tx.usuario.create({ data: userWriteData(user) });
          if (screens.length > 0) {
            await tx.acesso.createMany({
              data: screens.map((screen) => ({
                usuarioId: created.id,
                empresaId: screen.empresaId,
                sistemaId: screen.sistemaId,
                moduloId: screen.moduloId,
                menuId: screen.menuId,
                submenuId: screen.submenuId,
                tipoId: userTypeIdOf(screen.tipo),
                statusId: statusIdOf(screen.status),
              })),
            });
          }
          return created;
        });
        return toUser(row);
      } catch (error) {
        mapPersistenceError(error);
      }
    },
  };
}
