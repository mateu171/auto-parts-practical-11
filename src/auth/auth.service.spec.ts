
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';

type AsyncMock<T = any> = jest.Mock<(...args: any[]) => Promise<T>>;
type AuthServiceType = import('./auth.service.js').AuthService;

const bcryptHash = jest.fn<(...args: any[]) => Promise<string>>();
const bcryptCompare = jest.fn<(...args: any[]) => Promise<boolean>>();

jest.unstable_mockModule('bcrypt', () => ({
  hash: bcryptHash,
  compare: bcryptCompare,
  default: {
    hash: bcryptHash,
    compare: bcryptCompare,
  },
}));

let AuthServiceClass: typeof import('./auth.service.js').AuthService;

describe('AuthService', () => {
  let service: AuthServiceType;

  let usersService: {
    findByEmail: AsyncMock;
    create: AsyncMock;
    updateRefreshToken: AsyncMock<void>;
    findByIdWithRefreshToken: AsyncMock;
  };

  let jwtService: {
    signAsync: AsyncMock<string>;
    verifyAsync: AsyncMock;
  };

  const user = {
    id: 'u1',
    email: 'admin@test.com',
    passwordHash: 'hash',
    role: Role.ADMIN,
    hashedRefreshToken: 'stored-hash',
  };

  beforeAll(async () => {
    const authModule = await import('./auth.service.js');
    AuthServiceClass = authModule.AuthService;
  });

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn<(...args: any[]) => Promise<any>>(),
      create: jest.fn<(...args: any[]) => Promise<any>>(),
      updateRefreshToken: jest.fn<(...args: any[]) => Promise<void>>()
        .mockResolvedValue(undefined),
      findByIdWithRefreshToken: jest.fn<(...args: any[]) => Promise<any>>(),
    };

    jwtService = {
      signAsync: jest.fn<(...args: any[]) => Promise<string>>(),
      verifyAsync: jest.fn<(...args: any[]) => Promise<any>>(),
    };

    bcryptHash.mockReset();
    bcryptHash.mockResolvedValue('hashed-value');
    bcryptCompare.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceClass,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthServiceClass);
  });

  it('повинен бути визначений', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('створює користувача з роллю DRIVER і не повертає хеш пароля', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      usersService.create.mockResolvedValue({
        id: 'u2',
        email: 'new@test.com',
        role: Role.DRIVER,
        createdAt: new Date('2026-01-01'),
        passwordHash: 'hashed-value',
      });

      const result = await service.register('new@test.com', '123456');

      expect(usersService.create).toHaveBeenCalledWith({
        email: 'new@test.com',
        passwordHash: 'hashed-value',
        role: Role.DRIVER,
      });

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.role).toBe(Role.DRIVER);
    });

    it('викидає ConflictException, якщо email уже зайнятий', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.register(user.email, '123456'),
      ).rejects.toThrow(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('повертає токени та дані користувача за правильного пароля', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      bcryptCompare.mockResolvedValue(true);

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(user.email, '123456');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');

      expect(result.user).toEqual({
        id: 'u1',
        email: user.email,
        role: Role.ADMIN,
      });

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'u1',
        'hashed-value',
      );
    });

    it('викидає UnauthorizedException за неправильного пароля', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      bcryptCompare.mockResolvedValue(false);

      await expect(
        service.login(user.email, 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('викидає UnauthorizedException, якщо користувача не існує', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('none@test.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('викидає UnauthorizedException, якщо refresh token відсутній', async () => {
      await expect(
        service.refreshTokens(''),
      ).rejects.toThrow('Refresh Token відсутній');
    });

    it('викидає UnauthorizedException, якщо підпис токена недійсний', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(
        service.refreshTokens('bad'),
      ).rejects.toThrow('Недійсний Refresh Token');
    });

    it('викидає UnauthorizedException, якщо хеш токена не збігається', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u1' });
      usersService.findByIdWithRefreshToken.mockResolvedValue(user);
      bcryptCompare.mockResolvedValue(false);

      await expect(
        service.refreshTokens('old'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('видає нову пару токенів за дійсного refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u1' });
      usersService.findByIdWithRefreshToken.mockResolvedValue(user);
      bcryptCompare.mockResolvedValue(true);

      jwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refreshTokens('old');

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });
  });

  it('logout: обнуляє refresh token користувача', async () => {
    await service.logout('u1');

    expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
      'u1',
      null,
    );
  });
});
