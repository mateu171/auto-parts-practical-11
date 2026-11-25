import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;

  beforeEach(async () => {
    qb = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'u1' }),
    };
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((v) => ({ ...v })),
      save: jest.fn().mockImplementation((v) => Promise.resolve({ id: 'u1', ...v })),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('повинен бути визначений', () => {
    expect(service).toBeDefined();
  });

  it('findByEmail: шукає користувача за email', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'u1' });

    await expect(service.findByEmail('a@b.com')).resolves.toEqual({ id: 'u1' });
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
  });

  it('findById: повертає null, якщо користувача немає', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(service.findById('x')).resolves.toBeNull();
  });

  it('findByIdWithRefreshToken: додатково вибирає hashedRefreshToken', async () => {
    await service.findByIdWithRefreshToken('u1');

    expect(qb.addSelect).toHaveBeenCalledWith('user.hashedRefreshToken');
    expect(qb.where).toHaveBeenCalledWith('user.id = :id', { id: 'u1' });
  });

  it('create: створює та зберігає користувача', async () => {
    const result = await service.create({ email: 'a@b.com' });

    expect(mockRepo.create).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(result).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('updateRefreshToken: оновлює хеш токена', async () => {
    await service.updateRefreshToken('u1', null);

    expect(mockRepo.update).toHaveBeenCalledWith('u1', { hashedRefreshToken: null });
  });
});

