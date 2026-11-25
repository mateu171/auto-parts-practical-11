import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Length,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Condition } from './condition';

export class CreatePartDto {
  @ApiProperty({
    description: 'Назва запчастини',
    example: 'Гальмівні колодки передні',
    type: String,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Вартість запчастини в грн (більше 0)',
    example: 1850.5,
    type: Number,
    minimum: 0.01,
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    description: 'OEM-код запчастини (від 6 до 20 символів)',
    example: '1K0698151A',
    type: String,
    minLength: 6,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  oemCode: string;

  @ApiProperty({
    description: 'Стан запчастини: нова або відновлена',
    enum: Condition,
    example: Condition.NEW,
  })
  @IsEnum(Condition)
  condition: Condition;

  @ApiProperty({
    description: 'Марка автомобіля, до якого підходить запчастина',
    example: 'Volkswagen',
    type: String,
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  carBrand: string;
}
