import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Condition } from './condition';

export class UpdatePartDto {
  @ApiPropertyOptional({
    description: 'Нова назва запчастини',
    example: 'Гальмівні колодки задні',
    type: String,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({
    description: 'Нова вартість у грн (більше 0)',
    example: 1999,
    type: Number,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({
    description: 'Новий OEM-код (від 6 до 20 символів)',
    example: '1K0698451B',
    type: String,
    minLength: 6,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  oemCode?: string;

  @ApiPropertyOptional({
    description: 'Новий стан запчастини',
    enum: Condition,
    example: Condition.REFURBISHED,
  })
  @IsOptional()
  @IsEnum(Condition)
  condition?: Condition;

  @ApiPropertyOptional({
    description: 'Нова марка автомобіля',
    example: 'Skoda',
    type: String,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  carBrand?: string;
}
