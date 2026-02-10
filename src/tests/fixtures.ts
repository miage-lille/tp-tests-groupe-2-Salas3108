import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import Fastify, { FastifyInstance } from 'fastify';
import { AppContainer } from 'src/container';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { FixedDateGenerator } from 'src/core/adapters/fixed-date-generator';
import { webinarRoutes } from 'src/webinars/routes';
import { promisify } from 'util';

const asyncExec = promisify(exec);

export class TestServerFixture {
  private container!: StartedPostgreSqlContainer;
  private prismaClient!: PrismaClient;
  private serverInstance!: FastifyInstance;
  private appContainer!: AppContainer;

  async init() {
    this.container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .start();

    const dbUrl = this.container.getConnectionUri();

    // Initialiser Prisma et les dépendances
    this.prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    await asyncExec('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    await this.prismaClient.$connect();

    // Initialiser le conteneur avec Prisma (use fixed generators for deterministic tests)
    this.appContainer = new AppContainer();
    this.appContainer.init(
      this.prismaClient,
      new FixedIdGenerator(),
      new FixedDateGenerator(new Date('2024-01-01T00:00:00.000Z')),
    );

    // Initialiser le serveur
    this.serverInstance = Fastify({ logger: false });
    await webinarRoutes(this.serverInstance, this.appContainer);
    await this.serverInstance.ready();
  }

  getPrismaClient() {
    return this.prismaClient;
  }

  getServer() {
    return this.serverInstance.server;
  }

  async stop() {
    if (this.serverInstance) await this.serverInstance.close();
    if (this.prismaClient) await this.prismaClient.$disconnect();
    if (this.container) await this.container.stop();
  }

  async reset() {
    await this.prismaClient.webinar.deleteMany();
    await this.prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  }
}

export default TestServerFixture;
