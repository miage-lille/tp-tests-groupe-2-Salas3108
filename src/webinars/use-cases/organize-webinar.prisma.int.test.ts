import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { OrganizeWebinars } from './organize-webinar';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { FixedDateGenerator } from 'src/core/adapters/fixed-date-generator';
import { promisify } from 'util';

const asyncExec = promisify(exec);

describe('OrganizeWebinars (Prisma integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;
  let useCase: OrganizeWebinars;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .start();

    const dbUrl = container.getConnectionUri();

    prismaClient = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    await asyncExec('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: dbUrl },
    });

    await prismaClient.$connect();
  }, 120000);

  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    useCase = new OrganizeWebinars(
      repository,
      new FixedIdGenerator(),
      new FixedDateGenerator(new Date('2024-01-01T00:00:00.000Z')),
    );

    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    if (container) await container.stop({ timeout: 1000 });
    if (prismaClient) await prismaClient.$disconnect();
  });

  it('should create a webinar and return id', async () => {
    const payload = {
      userId: 'user-1',
      title: 'Prisma Webinar',
      seats: 10,
      startDate: new Date('2024-01-10T10:00:00.000Z'),
      endDate: new Date('2024-01-10T11:00:00.000Z'),
    };

    const result = await useCase.execute(payload);

    expect(result).toEqual({ id: 'id-1' });

    const created = await prismaClient.webinar.findUnique({ where: { id: 'id-1' } });
    expect(created).not.toBeNull();
    expect(created?.title).toBe('Prisma Webinar');
  });
});
