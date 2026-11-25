import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PartsService } from './parts.service';
import { CreatePartDto } from '../dto/create-part.dto';
import { UpdatePartDto } from '../dto/update-part.dto';
import { CreatePartWithRelationsDto } from '../dto/create-part-with-relations.dto';
import {
  ErrorResponseDto,
  MessageResponseDto,
  PaginatedPartsResponseDto,
  PartResponseDto,
} from '../dto/part-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

const ID_PARAM = {
  name: 'id',
  description: 'UUID запчастини',
  example: 'ef2d9ccd-70f8-4fd7-bd25-54b7edd4537d',
};

@ApiTags('Автозапчастини та вузли')
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) { }

  @Roles(Role.ADMIN)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Створення нової запчастини (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Запчастину успішно додано до бази', type: PartResponseDto })
  @ApiResponse({ status: 400, description: 'Некоректні вхідні дані (помилка валідації)', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Відсутній або недійсний JWT-токен', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Недостатньо прав (потрібна роль ADMIN)', type: ErrorResponseDto })
  create(@Body() dto: CreatePartDto) {
    return this.partsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.MECHANIC)
  @Post('with-relations')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Створення запчастини зі зв’язками (ADMIN, MECHANIC)',
    description:
      'У межах однієї транзакції створює код сумісності та запчастину, прив’язану до моделі авто й специфікацій.',
  })
  @ApiResponse({ status: 201, description: 'Запчастину зі зв’язками створено', type: PartResponseDto })
  @ApiResponse({ status: 400, description: 'Помилка валідації або примусовий rollback (simulateError)', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Відсутній або недійсний JWT-токен', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Недостатньо прав (потрібна роль ADMIN або MECHANIC)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Модель авто або специфікацію не знайдено', type: ErrorResponseDto })
  createWithRelations(@Body() dto: CreatePartWithRelationsDto) {
    return this.partsService.createWithRelations(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Список запчастин із пагінацією та пошуком за назвою' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Номер сторінки (за замовчуванням 1)' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Кількість записів на сторінці (1–100, за замовчуванням 10)' })
  @ApiQuery({ name: 'search', required: false, example: 'колодки', description: 'Пошук за частиною назви (без урахування регістру)' })
  @ApiResponse({ status: 200, description: 'Сторінка зі списком запчастин', type: PaginatedPartsResponseDto })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.partsService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
    );
  }

  @Public()
  @Get('by-relations')
  @ApiOperation({ summary: 'Пошук запчастин за моделлю авто та/або специфікацією' })
  @ApiQuery({ name: 'carModelId', required: false, description: 'UUID моделі автомобіля' })
  @ApiQuery({ name: 'specificationId', required: false, description: 'UUID специфікації' })
  @ApiResponse({ status: 200, description: 'Запчастини зі зв’язками (модель, специфікації, код сумісності)', type: [PartResponseDto] })
  findByRelations(
    @Query('carModelId') carModelId?: string,
    @Query('specificationId') specificationId?: string,
  ) {
    return this.partsService.findByRelations(carModelId, specificationId);
  }

  @Public()
  @Get(':id/with-relations')
  @ApiOperation({ summary: 'Запчастина за ID разом зі зв’язками' })
  @ApiParam(ID_PARAM)
  @ApiResponse({ status: 200, description: 'Запчастину знайдено', type: PartResponseDto })
  @ApiResponse({ status: 400, description: 'Некоректний формат UUID', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Запчастину не знайдено', type: ErrorResponseDto })
  findOneWithRelations(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.findOneWithRelations(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Отримання запчастини за ID' })
  @ApiParam(ID_PARAM)
  @ApiResponse({ status: 200, description: 'Запчастину знайдено', type: PartResponseDto })
  @ApiResponse({ status: 400, description: 'Некоректний формат UUID', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Запчастину не знайдено', type: ErrorResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/restore')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Відновлення видаленої (soft delete) запчастини (ADMIN)' })
  @ApiParam(ID_PARAM)
  @ApiResponse({ status: 200, description: 'Запчастину відновлено', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Некоректний формат UUID', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Відсутній або недійсний JWT-токен', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Недостатньо прав (потрібна роль ADMIN)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Видалену запчастину не знайдено', type: ErrorResponseDto })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.restore(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Часткове оновлення запчастини (ADMIN)' })
  @ApiParam(ID_PARAM)
  @ApiResponse({ status: 200, description: 'Запчастину оновлено', type: PartResponseDto })
  @ApiResponse({ status: 400, description: 'Помилка валідації або некоректний UUID', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Відсутній або недійсний JWT-токен', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Недостатньо прав (потрібна роль ADMIN)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Запчастину не знайдено', type: ErrorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartDto,
  ) {
    return this.partsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Видалення запчастини — soft delete (ADMIN)' })
  @ApiParam(ID_PARAM)
  @ApiResponse({ status: 200, description: 'Запчастину видалено', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Некоректний формат UUID', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Відсутній або недійсний JWT-токен', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Недостатньо прав (потрібна роль ADMIN)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Запчастину не знайдено', type: ErrorResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.remove(id);
  }
}
