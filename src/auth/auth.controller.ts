import {
  Body,
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ErrorResponseDto } from '../dto/part-response.dto';

@ApiTags('Автентифікація')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  private readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Реєстрація нового користувача (роль DRIVER)' })
  @ApiResponse({ status: 201, description: 'Користувача створено' })
  @ApiResponse({ status: 400, description: 'Помилка валідації (email / пароль)', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Користувач із таким email вже існує', type: ErrorResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Вхід у систему',
    description:
      'Повертає accessToken (15 хв) — його потрібно вставити в кнопку «Authorize». ' +
      'refreshToken встановлюється як httpOnly-cookie.',
  })
  @ApiResponse({ status: 200, description: 'Успішний вхід: accessToken та дані користувача' })
  @ApiResponse({ status: 400, description: 'Помилка валідації', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Невірний email або пароль', type: ErrorResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);

    response.cookie(
      'refreshToken',
      result.refreshToken,
      this.cookieOptions,
    );

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профіль поточного користувача' })
  @ApiResponse({ status: 200, description: 'Дані користувача з JWT' })
  @ApiResponse({ status: 401, description: 'Відсутній або недійсний JWT-токен', type: ErrorResponseDto })
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Оновлення пари токенів за refresh-cookie' })
  @ApiResponse({ status: 200, description: 'Новий accessToken' })
  @ApiResponse({ status: 401, description: 'Refresh Token відсутній або недійсний', type: ErrorResponseDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refreshToken;

    const result = await this.authService.refreshTokens(refreshToken);

    response.cookie(
      'refreshToken',
      result.refreshToken,
      this.cookieOptions,
    );

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Вихід із системи (анулювання refresh-токена)' })
  @ApiResponse({ status: 200, description: 'Вихід виконано успішно' })
  @ApiResponse({ status: 401, description: 'Відсутній або недійсний JWT-токен', type: ErrorResponseDto })
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.id);

    response.clearCookie('refreshToken', {
      ...this.cookieOptions,
      maxAge: undefined,
    });

    return {
      message: 'Вихід виконано успішно',
    };
  }
}