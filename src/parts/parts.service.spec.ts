import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PartsService } from './parts.service';
import { AutoPartEntity } from './entities/auto-part.entity';
import { CompatibilityCodeEntity } from './entities/compatibility-code.entity';
import { CreatePartDto } from '../dto/create-part.dto';
import { CreatePartWithRelationsDto } from '../dto/create-part-with-relations.dto';
import { Condition } from '../dto/condition';

const PART_ID = 'ef2d9ccd-70f8-4fd7-bd25-54b7edd4537d';

const createDto: CreatePartDto = {
  title: 'Гальмівні колодки передні',
  price: 1850,
  oemCode: '1K0698151A',
  condition: Condition.NEW,
  carBrand: 'Volkswagen',
};

const storedPart = { id: PART_ID, ...createDto } as unknown as AutoPartEntity;

describe('PartsService', () => {
  let service: PartsService;
  let mockRepo: Record<string, jest.Mock>;
  let mockQueryBuilder: Record<string, jest.Mock>;
  let mockDataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    // Arrange: ланцюжок QueryBuilder повертає сам себе, getMany/getOne — результати
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([storedPart]),
      getOne: jest.fn(),
    };

    mockRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest
        .fn()
        .mockImplementation((item) => Promise.resolve({ id: PART_ID, ...item })),
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
      softDelete: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockDataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsService,
        { provide: getRepositoryToken(AutoPartEntity), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PartsService>(PartsService);
  });

  it('повинен бути визначений', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('повинен успішно створити нову запчастину', async () => {
      const result = await service.create(createDto);

      expect(mockRepo.create).toHaveBeenCalledWith(createDto);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: PART_ID, ...createDto });
    });
  });

  describe('findOne', () => {
    it('повинен повернути запчастину за коректним ID', async () => {
      mockRepo.findOneBy.mockResolvedValue(storedPart);

      const result = await service.findOne(PART_ID);

      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: PART_ID });
      expect(result).toBe(storedPart);
    });

    it('повинен викидати NotFoundException, якщо запчастину не знайдено', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Part with ID non-existent-id not found',
      );
    });
  });

  describe('findAll', () => {
    it('повинен повернути сторінку даних із коректними метаданими пагінації', async () => {
      mockRepo.findAndCount.mockResolvedValue([[storedPart], 25]);

      const result = await service.findAll(2, 10, 'колодки');

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result).toEqual({
        data: [storedPart],
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('повинен застосувати фільтр пошуку за назвою лише коли search передано', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, 'колодки');
      expect(mockRepo.findAndCount).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { title: expect.anything() } }),
      );

      await service.findAll(1, 10);
      expect(mockRepo.findAndCount).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('повинен обмежувати некоректні page та limit допустимими межами', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(0, 1000);

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });
  });

  describe('update', () => {
    it('повинен оновити поля наявної запчастини', async () => {
      mockRepo.findOneBy.mockResolvedValue({ ...storedPart });

      const result = await service.update(PART_ID, { price: 2000 });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: PART_ID, price: 2000 }),
      );
      expect(result.price).toBe(2000);
    });

    it('повинен викидати NotFoundException при оновленні неіснуючої запчастини', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update(PART_ID, { price: 1 })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('повинен виконати soft delete наявної запчастини', async () => {
      mockRepo.findOneBy.mockResolvedValue(storedPart);

      const result = await service.remove(PART_ID);

      expect(mockRepo.softDelete).toHaveBeenCalledWith(PART_ID);
      expect(result).toEqual({ message: 'Part deleted successfully' });
    });

    it('не повинен видаляти неіснуючу запчастину', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(service.remove(PART_ID)).rejects.toThrow(NotFoundException);
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('повинен відновити видалену запчастину', async () => {
      mockRepo.restore.mockResolvedValue({ affected: 1 });

      await expect(service.restore(PART_ID)).resolves.toEqual({
        message: 'Part restored successfully',
      });
    });

    it('повинен викидати NotFoundException, якщо відновлювати нічого', async () => {
      mockRepo.restore.mockResolvedValue({ affected: 0 });

      await expect(service.restore(PART_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByRelations', () => {
    it('повинен додати обидві умови фільтрації, якщо передано обидва параметри', async () => {
      const result = await service.findByRelations('car-1', 'spec-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(result).toEqual([storedPart]);
    });

    it('не повинен додавати умов, якщо параметри не передано', async () => {
      await service.findByRelations();

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });

  describe('findOneWithRelations', () => {
    it('повинен повернути запчастину зі зв’язками', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(storedPart);

      await expect(service.findOneWithRelations(PART_ID)).resolves.toBe(
        storedPart,
      );
    });

    it('повинен викидати NotFoundException, якщо запчастину не знайдено', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOneWithRelations(PART_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createWithRelations', () => {
    const relationsDto: CreatePartWithRelationsDto = {
      ...createDto,
      carModelId: 'car-model-1',
      specificationIds: ['spec-1', 'spec-2'],
      compatibilityCode: 'VW-GOLF7-BRK-001',
    };

    let manager: { findOne: jest.Mock; find: jest.Mock; getRepository: jest.Mock };
    let codeRepo: Record<string, jest.Mock>;
    let partRepo: Record<string, jest.Mock>;
    const carModel = { id: 'car-model-1', name: 'Golf 7', brand: 'Volkswagen' };
    const specs = [{ id: 'spec-1' }, { id: 'spec-2' }];

    beforeEach(() => {
      codeRepo = {
        create: jest.fn().mockImplementation((v) => ({ id: 'code-1', ...v })),
        save: jest.fn().mockResolvedValue(undefined),
      };
      partRepo = {
        create: jest.fn().mockImplementation((v) => ({ ...v })),
        save: jest.fn().mockImplementation((v) => Promise.resolve({ id: PART_ID, ...v })),
      };
      manager = {
        findOne: jest.fn().mockResolvedValue(carModel),
        find: jest.fn().mockResolvedValue(specs),
        getRepository: jest.fn((entity) =>
          entity === CompatibilityCodeEntity ? codeRepo : partRepo,
        ),
      };
      // імітуємо dataSource.transaction: просто викликаємо callback із mock-менеджером
      mockDataSource.transaction.mockImplementation((cb) => cb(manager));
    });

    it('повинен створити запчастину зі зв’язками в межах транзакції', async () => {
      const result = await service.createWithRelations(relationsDto);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(codeRepo.create).toHaveBeenCalledWith({ code: 'VW-GOLF7-BRK-001' });
      expect(partRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createDto.title,
          carModel,
          specifications: specs,
        }),
      );
      expect(result).toEqual(expect.objectContaining({ id: PART_ID }));
    });

    it('повинен викидати NotFoundException, якщо модель авто не знайдено', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.createWithRelations(relationsDto)).rejects.toThrow(
        'Car model not found',
      );
      expect(partRepo.save).not.toHaveBeenCalled();
    });

    it('повинен викидати NotFoundException, якщо знайдено не всі специфікації', async () => {
      manager.find.mockResolvedValue([{ id: 'spec-1' }]);

      await expect(service.createWithRelations(relationsDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('повинен викидати BadRequestException при simulateError (rollback транзакції)', async () => {
      await expect(
        service.createWithRelations({ ...relationsDto, simulateError: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

