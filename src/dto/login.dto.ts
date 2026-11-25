import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email користувача',
    example: 'admin@test.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Некоректний формат email' })
  email: string;

  @ApiProperty({
    description: 'Пароль (мінімум 6 символів)',
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Пароль повинен містити мінімум 6 символів' })
  password: string;
}
