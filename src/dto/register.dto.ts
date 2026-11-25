import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email нового користувача',
    example: 'driver@test.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Некоректний формат email' })
  email: string;

  @ApiProperty({
    description: 'Пароль (від 6 до 64 символів)',
    example: '123456',
    minLength: 6,
    maxLength: 64,
  })
  @IsString()
  @MinLength(6, { message: 'Пароль повинен містити мінімум 6 символів' })
  @MaxLength(64, { message: 'Пароль повинен містити максимум 64 символи' })
  password: string;
}
