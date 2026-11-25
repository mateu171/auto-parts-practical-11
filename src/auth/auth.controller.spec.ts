import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
describe('AuthController', () => {
  let controller: AuthController;
  let authService: Record<string, jest.Mock>;
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({ id: 'u1' }),
      login: jest.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { id: 'u1', email: 'a@b.com', role: 'ADMIN' },
      }),
      refreshTokens: jest.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      }),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('повинен бути визначений', () => {
    expect(controller).toBeDefined();
  });

  it('register: делегує реєстрацію сервісу', async () => {
    await controller.register({ email: 'a@b.com', password: '123456' });

    expect(authService.register).toHaveBeenCalledWith('a@b.com', '123456');
  });

  it('login: повертає accessToken, а refreshToken кладе в httpOnly cookie', async () => {
    const result = await controller.login(
      { email: 'a@b.com', password: '123456' },
      res as unknown as Response,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({
      accessToken: 'access',
      user: { id: 'u1', email: 'a@b.com', role: 'ADMIN' },
    });
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('getProfile: повертає користувача з запиту', () => {
    const user = { id: 'u1' };

    expect(controller.getProfile(user)).toBe(user);
  });

  it('refresh: читає refresh token із cookie та оновлює cookie', async () => {
    const req = { cookies: { refreshToken: 'old' } } as unknown as Request;

    const result = await controller.refresh(req, res as unknown as Response);

    expect(authService.refreshTokens).toHaveBeenCalledWith('old');
    expect(res.cookie).toHaveBeenCalled();
    expect(result).toEqual({ accessToken: 'new-access' });
  });

  it('logout: викликає сервіс і очищає cookie', async () => {
    const result = await controller.logout({ id: 'u1' }, res as unknown as Response);

    expect(authService.logout).toHaveBeenCalledWith('u1');
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    expect(result).toEqual({ message: 'Вихід виконано успішно' });
  });
});

