import { PrismaClient } from '@prisma/client';

import {
	PostgreSqlContainer,
	StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from './webinar-repository.prisma';
import { Webinar } from '../entities/webinar.entity';
import { promisify } from 'util';


jest.setTimeout(120_000);

const asyncExec = promisify(exec);

describe('PrismaWebinarRepository', () => {
	let container: StartedPostgreSqlContainer;
	let prismaClient: PrismaClient;
	let repository: PrismaWebinarRepository;

	beforeAll(async () => {
		container = await new PostgreSqlContainer()
			.withDatabase('test_db')
			.withUsername('user_test')
			.withPassword('password_test')
			.withExposedPorts(5432)
			.start();

		const dbUrl = container.getConnectionUri();

		prismaClient = new PrismaClient({
			datasources: {
				db: { url: dbUrl },
			},
		});

		// Run migrations to populate the database (pass DATABASE_URL via env for Windows compatibility)
		await asyncExec('npx prisma migrate deploy', {
			env: { ...process.env, DATABASE_URL: dbUrl },
		});

		await prismaClient.$connect();
	});

	beforeEach(async () => {
		repository = new PrismaWebinarRepository(prismaClient);
		await prismaClient.webinar.deleteMany();
		await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
	});

	afterAll(async () => {
		if (container) await container.stop({ timeout: 1000 });
		if (prismaClient) await prismaClient.$disconnect();
	});

	describe('Scenario : repository.create', () => {
		it('should create a webinar', async () => {
			// ARRANGE
			const webinar = new Webinar({
				id: 'webinar-id',
				organizerId: 'organizer-id',
				title: 'Webinar title',
				startDate: new Date('2022-01-01T00:00:00.000Z'),
				endDate: new Date('2022-01-01T01:00:00.000Z'),
				seats: 100,
			});

			// ACT
			await repository.create(webinar);

			// ASSERT
			const maybeWebinar = await prismaClient.webinar.findUnique({
				where: { id: 'webinar-id' },
			});

			expect(maybeWebinar).toEqual({
				id: 'webinar-id',
				organizerId: 'organizer-id',
				title: 'Webinar title',
				startDate: new Date('2022-01-01T00:00:00.000Z'),
				endDate: new Date('2022-01-01T01:00:00.000Z'),
				seats: 100,
			});
		});
	});

	describe('Scenario : repository.findById', () => {
		it('should return a webinar when it exists', async () => {
			// ARRANGE
			await prismaClient.webinar.create({
				data: {
					id: 'find-id',
					organizerId: 'org-1',
					title: 'Find Webinar',
					startDate: new Date('2022-02-01T00:00:00.000Z'),
					endDate: new Date('2022-02-01T01:00:00.000Z'),
					seats: 50,
				},
			});

			// ACT
			const maybe = await repository.findById('find-id');

			// ASSERT
			expect(maybe).not.toBeNull();
			expect(maybe?.props.id).toBe('find-id');
			expect(maybe?.props.seats).toBe(50);
		});

		it('should return null when not found', async () => {
			const maybe = await repository.findById('missing');
			expect(maybe).toBeNull();
		});
	});

	describe('Scenario : repository.update', () => {
		it('should update an existing webinar', async () => {
			await prismaClient.webinar.create({
				data: {
					id: 'update-id',
					organizerId: 'org-2',
					title: 'Update Webinar',
					startDate: new Date('2022-03-01T00:00:00.000Z'),
					endDate: new Date('2022-03-01T01:00:00.000Z'),
					seats: 20,
				},
			});

			const webinar = await repository.findById('update-id');
			expect(webinar).not.toBeNull();

			webinar!.update({ seats: 30 });

			await repository.update(webinar!);

			const updated = await prismaClient.webinar.findUnique({ where: { id: 'update-id' } });
			expect(updated?.seats).toBe(30);
		});
	});
});