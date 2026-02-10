import { PrismaClient } from '@prisma/client';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { RealDateGenerator } from 'src/core/adapters/real-date-generator';

export class AppContainer {
  private prismaClient!: PrismaClient;
  private webinarRepository!: PrismaWebinarRepository;
  private changeSeatsUseCase!: ChangeSeats;
  private organizeWebinarsUseCase!: OrganizeWebinars;

  init(
    prismaClient: PrismaClient,
    idGenerator?: import('src/core/ports/id-generator.interface').IIdGenerator,
    dateGenerator?: import('src/core/ports/date-generator.interface').IDateGenerator,
  ) {
    this.prismaClient = prismaClient;
    this.webinarRepository = new PrismaWebinarRepository(this.prismaClient);
    this.changeSeatsUseCase = new ChangeSeats(this.webinarRepository);
    this.organizeWebinarsUseCase = new OrganizeWebinars(
      this.webinarRepository,
      idGenerator ?? new FixedIdGenerator(),
      dateGenerator ?? new RealDateGenerator(),
    );
  }

  getPrismaClient() {
    return this.prismaClient;
  }

  getChangeSeatsUseCase() {
    return this.changeSeatsUseCase;
  }

  getOrganizeWebinarsUseCase() {
    return this.organizeWebinarsUseCase;
  }
}

export const container = new AppContainer();