import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartFoundDto {
  @ApiProperty({
    description: 'UUID підібраної запчастини',
    example: 'ef2d9ccd-70f8-4fd7-bd25-54b7edd4537d',
    format: 'uuid',
  })
  @IsUUID()
  partId: string;

  @ApiProperty({
    description: 'Email покупця, якому надсилається лист',
    example: 'client@example.com',
    format: 'email',
  })
  @IsEmail()
  customerEmail: string;

  @ApiPropertyOptional({
    description: 'Коментар менеджера (до 500 символів)',
    example: 'Деталь є в наявності, сумісна з вашим авто',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  managerComment?: string;
}
