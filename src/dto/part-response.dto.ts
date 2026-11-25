import { ApiProperty } from '@nestjs/swagger';
import { Condition } from './condition';

/** Схема відповіді API (використовується лише для документації Swagger). */
export class PartResponseDto {
  @ApiProperty({ example: 'ef2d9ccd-70f8-4fd7-bd25-54b7edd4537d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Гальмівні колодки передні' })
  title: string;

  @ApiProperty({ example: 1850.5 })
  price: number;

  @ApiProperty({ example: '1K0698151A' })
  oemCode: string;

  @ApiProperty({ enum: Condition, example: Condition.NEW })
  condition: Condition;

  @ApiProperty({ example: 'Volkswagen' })
  carBrand: string;

  @ApiProperty({ example: '2026-11-24T12:00:00.000Z', format: 'date-time' })
  createdAt: string;

  @ApiProperty({ example: '2026-11-24T12:00:00.000Z', format: 'date-time' })
  updatedAt: string;
}

export class PaginatedPartsResponseDto {
  @ApiProperty({ type: [PartResponseDto] })
  data: PartResponseDto[];

  @ApiProperty({ example: 25, description: 'Загальна кількість записів' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Part deleted successfully' })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: '2026-11-24T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/parts' })
  path: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['oemCode must be longer than or equal to 6 characters'],
  })
  message: string | string[];
}
