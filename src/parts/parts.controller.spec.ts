import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
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

describe('PartsController', () => {
  let controller: PartsController;
  let mockService: Record<string, jest.Mock>;

  beforeEach(async () => {
    // Усі методи сервісу замінено на jest.fn() з підставними відповідями
    mockService = {
      create: jest.fn().mockResolvedValue({ id: PART_ID, ...createDto }),
      createWithRelations: jest.fn().mockResolvedValue({ id: PART_ID, ...createDto }),
      findAll: jest.fn().mockResolvedValue({
        data: [{ id: PART_ID, ...createDto }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }),
      findByRelations: jest.fn().mockResolvedValue([]),
      findOneWithRelations: jest.fn().mockResolvedValue({ id: PART_ID }),
      findOne: jest.fn().mockResolvedValue({ id: PART_ID, ...createDto }),
      update: jest.fn().mockResolvedValue({ id: PART_ID, price: 2000 }),
      remove: jest.fn().mockResolvedValue({ message: 'Part deleted successfully' }),
      restore: jest.fn().mockResolvedValue({ message: 'Part restored successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartsController],
      providers: [{ provide: PartsService, useValue: mockService }],
    }).compile();

    controller = module.get<PartsController>(PartsController);
  });

  it('повинен бути визначений', () => {
    expect(controller).toBeDefined();
  });

  it('create: передає DTO в сервіс і повертає створену запчастину', async () => {
    const result = await controller.create(createDto);

    expect(mockService.create).toHaveBeenCalledWith(createDto);
    expect(result).toEqual({ id: PART_ID, ...createDto });
  });

  it('createWithRelations: передає DTO в сервіс', async () => {
    const dto: CreatePartWithRelationsDto = {
      ...createDto,
      carModelId: 'car-model-1',
      specificationIds: ['spec-1'],
      compatibilityCode: 'VW-GOLF7-BRK-001',
    };

    await controller.createWithRelations(dto);

    expect(mockService.createWithRelations).toHaveBeenCalledWith(dto);
  });

  it('findAll: перетворює query-параметри на числа та викликає сервіс', async () => {
    await controller.findAll('2', '5', 'колодки');

    expect(mockService.findAll).toHaveBeenCalledWith(2, 5, 'колодки');
  });

  it('findAll: використовує значення за замовчуванням (page=1, limit=10)', async () => {
    const result = await controller.findAll();

    expect(mockService.findAll).toHaveBeenCalledWith(1, 10, undefined);
    expect(result.total).toBe(1);
  });

  it('findByRelations: передає фільтри в сервіс', async () => {
    await controller.findByRelations('car-1', 'spec-1');

    expect(mockService.findByRelations).toHaveBeenCalledWith('car-1', 'spec-1');
  });

  it('findOne: повертає запчастину за ID', async () => {
    const result = await controller.findOne(PART_ID);

    expect(mockService.findOne).toHaveBeenCalledWith(PART_ID);
    expect(result).toEqual(expect.objectContaining({ id: PART_ID }));
  });

  it('findOne: пробрасує NotFoundException із сервісу', async () => {
    mockService.findOne.mockRejectedValue(new NotFoundException());

    await expect(controller.findOne(PART_ID)).rejects.toThrow(NotFoundException);
  });

  it('findOneWithRelations: викликає відповідний метод сервісу', async () => {
    await controller.findOneWithRelations(PART_ID);

    expect(mockService.findOneWithRelations).toHaveBeenCalledWith(PART_ID);
  });

  it('update: передає ID та DTO в сервіс', async () => {
    const result = await controller.update(PART_ID, { price: 2000 });

    expect(mockService.update).toHaveBeenCalledWith(PART_ID, { price: 2000 });
    expect(result).toEqual({ id: PART_ID, price: 2000 });
  });

  it('remove: викликає сервіс і повертає повідомлення', async () => {
    const result = await controller.remove(PART_ID);

    expect(mockService.remove).toHaveBeenCalledWith(PART_ID);
    expect(result).toEqual({ message: 'Part deleted successfully' });
  });

  it('restore: викликає сервіс відновлення', async () => {
    const result = await controller.restore(PART_ID);

    expect(mockService.restore).toHaveBeenCalledWith(PART_ID);
    expect(result).toEqual({ message: 'Part restored successfully' });
  });
});

