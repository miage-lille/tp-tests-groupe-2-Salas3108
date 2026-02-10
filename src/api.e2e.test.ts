import supertest from 'supertest';
import TestServerFixture from 'src/tests/fixtures';
import { PrismaClient } from '@prisma/client';

// Allow longer time for container + migrations
jest.setTimeout(120_000);

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  it('should update webinar seats (happy path)', async () => {
    const prisma: PrismaClient = fixture.getPrismaClient();
    const server = fixture.getServer();

    const webinar = await prisma.webinar.create({
      data: {
        id: 'test-webinar',
        title: 'Webinar Test',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'test-user',
      },
    });

    const response = await supertest(server)
      .post(`/webinars/${webinar.id}/seats`)
      .send({ seats: '30' })
      .expect(200);

    expect(response.body).toEqual({ message: 'Seats updated' });

    const updatedWebinar = await prisma.webinar.findUnique({ where: { id: webinar.id } });
    expect(updatedWebinar?.seats).toBe(30);
  });

  it('should return 404 when webinar not found', async () => {
    const server = fixture.getServer();

    const response = await supertest(server)
      .post('/webinars/missing-id/seats')
      .send({ seats: '10' })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when user is not organizer', async () => {
    const prisma: PrismaClient = fixture.getPrismaClient();
    const server = fixture.getServer();

    const webinar = await prisma.webinar.create({
      data: {
        id: 'not-organizer',
        title: 'Other Webinar',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'someone-else',
      },
    });

    const response = await supertest(server)
      .post(`/webinars/${webinar.id}/seats`)
      .send({ seats: '20' })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  describe('Organize Webinar E2E', () => {
    it('should create a webinar via HTTP', async () => {
      const prisma = fixture.getPrismaClient();
      const server = fixture.getServer();

      const payload = {
        title: 'E2E Webinar',
        seats: 10,
        startDate: new Date('2024-01-10T10:00:00.000Z').toISOString(),
        endDate: new Date('2024-01-10T11:00:00.000Z').toISOString(),
      };

      const response = await supertest(server).post('/webinars').send(payload).expect(201);
      expect(response.body).toHaveProperty('id');

      const created = await prisma.webinar.findUnique({ where: { id: response.body.id } });
      expect(created).not.toBeNull();
      expect(created?.title).toBe('E2E Webinar');
    });

    it('should return 400 when webinar is too soon', async () => {
      const server = fixture.getServer();
      // use dates close to the fixture's fixed date (2024-01-01) to trigger "too soon"
      const payload = {
        title: 'Too Soon',
        seats: 10,
        startDate: new Date('2024-01-02T00:00:00.000Z').toISOString(),
        endDate: new Date('2024-01-02T01:00:00.000Z').toISOString(),
      };

      const response = await supertest(server).post('/webinars').send(payload).expect(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
