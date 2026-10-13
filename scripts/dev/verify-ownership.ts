import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const suffix = Date.now().toString();

try {
  await prisma.$connect();
  const empresa = await prisma.empresa.create({
    data: { nome: `Empresa ${suffix}`, cnpj: suffix.slice(-14) },
  });
  const sistema = await prisma.sistema.create({
    data: { nome: `Sistema ${suffix}`, empresaId: empresa.id },
  });
  const modulo = await prisma.modulo.create({
    data: { nome: `Modulo ${suffix}`, sistemaId: sistema.id },
  });
  const menu = await prisma.menu.create({
    data: { nome: `Menu ${suffix}`, moduloId: modulo.id },
  });
  const submenu = await prisma.submenu.create({
    data: { nome: `Submenu ${suffix}`, menuId: menu.id },
  });

  await expectConstraint(() =>
    prisma.sistema.create({ data: { nome: `Sistema ${suffix}`, empresaId: empresa.id } }),
  );
  await expectConstraint(() =>
    prisma.sistema.create({
      data: { nome: `Outro ${suffix}`, empresaId: '00000000-0000-4000-8000-000000000000' },
    }),
  );
  await expectConstraint(() => prisma.empresa.delete({ where: { id: empresa.id } }));
  await expectConstraint(() => prisma.empresa.create({ data: { nome: '   ' } }));

  await prisma.submenu.delete({ where: { id: submenu.id } });
  await prisma.menu.delete({ where: { id: menu.id } });
  await prisma.modulo.delete({ where: { id: modulo.id } });
  await prisma.sistema.delete({ where: { id: sistema.id } });
  await prisma.empresa.delete({ where: { id: empresa.id } });

  const remaining = await prisma.empresa.count({ where: { id: empresa.id } });
  if (remaining !== 0) throw new Error('Verification rows were not removed');
  console.log('ownership hierarchy verified: required parent, unique name, restrict delete, non-empty name');
} finally {
  await prisma.$disconnect();
}

async function expectConstraint(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2003', 'P2004', 'P2010'].includes(error.code)) {
      return;
    }
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Check constraint') || message.includes('constraint')) return;
    throw error;
  }
  throw new Error('Expected the database to reject an invalid ownership operation');
}
