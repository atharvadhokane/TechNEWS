const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  await prisma.article.upsert({
    where: { url: 'https://example.com/sample-article' },
    update: {},
    create: {
      title: 'Sample AI Tech Article',
      url: 'https://example.com/sample-article',
      source: 'seed',
      rawContent: 'This is placeholder raw content for local development.',
      summary: 'A short AI-generated summary would go here.',
      headline: 'Sample AI Tech Article — Seeded',
      category: 'AI',
      tags: ['llm', 'seed-data'],
      trendingScore: 10,
      status: 'ENRICHED',
    },
  });

  console.log('Seed complete. Admin user:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
