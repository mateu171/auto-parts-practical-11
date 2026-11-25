import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePartDto } from './create-part.dto';

export class CreatePartWithRelationsDto extends CreatePartDto {
  @ApiProperty({
    description: 'UUID моделі автомобіля (car_models.id)',
    example: 'b3b0f1c2-6a1e-4a5d-9a4b-2f1c8d7e6a10',
    format: 'uuid',
  })
  @IsUUID()
  carModelId: string;

  @ApiProperty({
    description: 'Список UUID технічних специфікацій (specifications.id)',
    example: ['0f6c4a52-8b1d-4c1e-a7d3-5e2b9c1a4f33'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  specificationIds: string[];

  @ApiProperty({
    description: 'Унікальний код сумісності',
    example: 'VW-GOLF7-BRK-001',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  compatibilityCode: string;

  @ApiPropertyOptional({
    description: 'Службовий прапорець: примусово викликати помилку для перевірки rollback транзакції',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  simulateError?: boolean;
}
