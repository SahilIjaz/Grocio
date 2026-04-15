import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deleteDemo() {
  try {
    const demoId = '15c67270-e496-4244-876a-48966b0c65b3';

    console.log('Deleting demo store...');

    // Delete in order of dependencies
    await prisma.orderItem.deleteMany({ where: { tenantId: demoId } });
    await prisma.order.deleteMany({ where: { tenantId: demoId } });
    await prisma.cartItem.deleteMany({ where: { cart: { tenantId: demoId } } });
    await prisma.cart.deleteMany({ where: { tenantId: demoId } });
    await prisma.product.deleteMany({ where: { tenantId: demoId } });
    await prisma.category.deleteMany({ where: { tenantId: demoId } });
    await prisma.user.deleteMany({ where: { tenantId: demoId } });
    const deleted = await prisma.tenant.delete({ where: { id: demoId } });

    console.log('✅ Demo store deleted:', deleted.name);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDemo();
