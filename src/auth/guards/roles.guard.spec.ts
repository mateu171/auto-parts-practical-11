import { jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../users/enums/role.enum';

const makeContext = (type: string, user?: { role: Role }): ExecutionContext =>
  ({
    getType: () => type,
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('пропускає не-HTTP контекст (WebSocket)', () => {
    expect(guard.canActivate(makeContext('ws'))).toBe(true);
  });

  it('пропускає маршрут без вимог до ролей', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(makeContext('http', { role: Role.DRIVER }))).toBe(true);
  });

  it('пропускає користувача з потрібною роллю', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(makeContext('http', { role: Role.ADMIN }))).toBe(true);
  });

  it('викидає ForbiddenException для користувача з іншою роллю', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(makeContext('http', { role: Role.DRIVER })),
    ).toThrow(ForbiddenException);
  });

  it('викидає ForbiddenException, якщо користувача немає в запиті', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(makeContext('http'))).toThrow(ForbiddenException);
  });
});

