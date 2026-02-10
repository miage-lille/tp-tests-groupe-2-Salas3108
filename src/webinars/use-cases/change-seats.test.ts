// Tests unitaires
import { testUser } from 'src/users/tests/user-seeds';
import { InMemoryWebinarRepository } from '../adapters/webinar-repository.in-memory';
import { ChangeSeats } from './change-seats';
import { Webinar } from '../entities/webinar.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';

describe('Feature : Change seats', () => {
  let repository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  const initialWebinar = new Webinar({
    id: 'webinar-123',
    organizerId: testUser.alice.props.id,
    title: 'Sample Webinar',
    startDate: new Date('2024-07-01T10:00:00.000Z'),
    endDate: new Date('2024-07-01T12:00:00.000Z'),
    seats: 100,
  });

  beforeEach(() => {
    repository = new InMemoryWebinarRepository([initialWebinar]);
    useCase = new ChangeSeats(repository);
  });

  function expectWebinarSeatsToBe(expected: number) {
    const webinar = repository.findByIdSync('webinar-123');
    expect(webinar?.props.seats).toEqual(expected);
  }

  describe('Scenario: Happy path', () => {
    it('should change the number of seats for a webinar', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-123',
        seats: 150,
      };

      await useCase.execute(payload);

      expectWebinarSeatsToBe(150);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    it('should throw WebinarNotFoundException and not modify repository', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'not-existing',
        seats: 200,
      };

      await expect(useCase.execute(payload)).rejects.toBeInstanceOf(
        WebinarNotFoundException,
      );

      // ensure original webinar unchanged
      expectWebinarSeatsToBe(100);
    });
  });

  describe('Scenario: update the webinar of someone else', () => {
    it('should throw WebinarNotOrganizerException and not modify repository', async () => {
      const payload = {
        user: testUser.bob,
        webinarId: 'webinar-123',
        seats: 150,
      };

      await expect(useCase.execute(payload)).rejects.toBeInstanceOf(
        WebinarNotOrganizerException,
      );

      expectWebinarSeatsToBe(100);
    });
  });

  describe('Scenario: change seat to an inferior number', () => {
    it('should throw WebinarReduceSeatsException and not modify repository', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-123',
        seats: 50,
      };

      await expect(useCase.execute(payload)).rejects.toBeInstanceOf(
        WebinarReduceSeatsException,
      );

      expectWebinarSeatsToBe(100);
    });
  });

  describe('Scenario: change seat to a number > 1000', () => {
    it('should throw WebinarTooManySeatsException and not modify repository', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-123',
        seats: 2000,
      };

      await expect(useCase.execute(payload)).rejects.toBeInstanceOf(
        WebinarTooManySeatsException,
      );

      expectWebinarSeatsToBe(100);
    });
  });
});