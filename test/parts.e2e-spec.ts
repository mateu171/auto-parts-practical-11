import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { setupApp } from '../src/app.setup';
import { setupSwagger } from '../src/swagger';
import { PartsController } from '../src/parts/parts.controller';
import { PartsService } from '../src/parts/parts.service';
import { AutoPartEntity } from '../src/parts/entities/auto-part.entity';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UsersService } from '../src/users/users.service';
import { Role } from '../src/users/enums/role.enum';

const SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-key';
const PART_ID = 'ef2d9ccd-70f8-4fd7-bd25-54b7edd4537d';

const validPart = {
  title: 'Гальмівні колодки передні',
  price: 1850.5,
  oemCode: '1K0698151A',
  condition: 'NEW',
  carBrand: 'Volkswagen',
};

/**
 * E2E без реальної бази даних: піднімається справжній HTTP-конвеєр
 * (TrimPipe + ValidationPipe, JwtAuthGuard, RolesGuard, фільтр винятків),
 * а TypeORM-репозиторій і UsersService замінено mock-об'єктами.
 */
describe('Parts API (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let mockRepo: Record<string, jest.Mock>;
  let currentUser: { id: string; email: string; role: Role };

  const tokenFor = (role: Role) => {
    currentUser = { id: 'user-1', email: `${role.toLowerCase()}@test.com`, role };
    return jwt.sign({ sub: currentUser.id, email: currentUser.email, role });
  };

  beforeAll(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((item) =>
        Promise.resolve({
          id: PART_ID,
          createdAt: '2026-11-24T12:00:00.000Z',
          updatedAt: '2026-11-24T12:00:00.000Z',
          ...item,
        }),
      ),
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: SECRET })],
      controllers: [PartsController],
      providers: [
        PartsService,
        JwtStrategy,
        { provide: getRepositoryToken(AutoPartEntity), useValue: mockRepo },
        { provide: DataSource, useValue: {} },
        {
          provide: UsersService,
          useValue: { findById: jest.fn(() => Promise.resolve(currentUser)) },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app); // той самий конвеєр, що й у main.ts
    setupSwagger(app);
    await app.init();

    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /parts', () => {
    it('створення сутності з валідними даними [201 Created]', async () => {
      const res = await request(app.getHttpServer())
        .post('/parts')
        .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
        .send(validPart)
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          id: PART_ID,
          title: validPart.title,
          price: validPart.price,
          oemCode: validPart.oemCode,
          condition: 'NEW',
          carBrand: validPart.carBrand,
        }),
      );
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('відхилення VIN/OEM-коду коротшого за стандарт [400 Bad Request]', async () => {
      const res = await request(app.getHttpServer())
        .post('/parts')
        .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
        .send({ ...validPart, oemCode: 'AB1' })
        .expect(400);

      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.join(' ')).toMatch(/oemCode/);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('відхилення від’ємної ціни та порожньої назви [400 Bad Request]', async () => {
      const res = await request(app.getHttpServer())
        .post('/parts')
        .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
        .send({ ...validPart, price: -10, title: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message.length).toBeGreaterThanOrEqual(2);
    });

    it('відхилення невідомого стану запчастини (поза enum) [400]', async () => {
      await request(app.getHttpServer())
        .post('/parts')
        .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
        .send({ ...validPart, condition: 'BROKEN' })
        .expect(400);
    });

    it('відхилення зайвих полів (forbidNonWhitelisted) [400]', async () => {
      await request(app.getHttpServer())
        .post('/parts')
        .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
        .send({ ...validPart, hacker: true })
        .expect(400);
    });

    it('заборона доступу без токена [401 Unauthorized]', async () => {
      await request(app.getHttpServer())
        .post('/parts')
        .send(validPart)
        .expect(401);

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('заборона доступу для ролі DRIVER [403 Forbidden]', async () => {
      await request(app.getHttpServer())
        .post('/parts')
        .set('Authorization', `Bearer ${tokenFor(Role.DRIVER)}`)
        .send(validPart)
        .expect(403);
    });
  });

  describe('DELETE /parts/:id', () => {
    it('заборона видалення без токена [401 Unauthorized]', async () => {
      await request(app.getHttpServer()).delete(`/parts/${PART_ID}`).expect(401);
    });

    it('ADMIN успішно видаляє наявну запчастину [200]', async () => {
      mockRepo.findOneBy.mockResolvedValue({ id: PART_ID, ...validPart });
      mockRepo.softDelete.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .delete(`/parts/${PART_ID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
        .expect(200);

      expect(res.body).toEqual({ message: 'Part deleted successfully' });
    });
  });

  describe('GET /parts', () => {
    it('публічний список запчастин [200 OK]', async () => {
      mockRepo.findAndCount.mockResolvedValue([[{ id: PART_ID, ...validPart }], 1]);

      const res = await request(app.getHttpServer()).get('/parts').expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({ total: 1, page: 1, limit: 10, totalPages: 1 }),
      );
      expect(res.body.data).toHaveLength(1);
    });

    it('неіснуюча запчастина [404 Not Found]', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await request(app.getHttpServer()).get(`/parts/${PART_ID}`).expect(404);
    });

    it('некоректний UUID [400 Bad Request]', async () => {
      await request(app.getHttpServer()).get('/parts/not-a-uuid').expect(400);
    });
  });

  describe('Swagger / OpenAPI', () => {
    it('GET /api/docs повертає HTML-сторінку Swagger UI [200]', async () => {
      const res = await request(app.getHttpServer()).get('/api/docs').expect(200);

      expect(res.headers['content-type']).toMatch(/html/);
    });

    it('GET /api/docs-json експортує специфікацію OpenAPI 3.0', async () => {
      const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      expect(res.body.openapi).toMatch(/^3\.0/);
      expect(res.body.info.title).toContain('Автозапчастини');
      expect(res.body.paths['/parts']).toBeDefined();
      expect(res.body.components.securitySchemes.bearer).toEqual(
        expect.objectContaining({ type: 'http', scheme: 'bearer' }),
      );
    });
  });
});
