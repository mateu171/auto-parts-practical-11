import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ParseVinPipe } from '../common/pipes/parse-vin.pipe';
import { PartFoundDto } from '../dto/part-found.dto';
import { ErrorResponseDto } from '../dto/part-response.dto';
import { Role } from '../users/enums/role.enum';
import { NotificationsService } from './notifications.service';

@ApiTags('Сповіщення')
@Controller('requests')
export class PartRequestsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Менеджер (ADMIN/MECHANIC) повідомляє, що для запиту за VIN підібрано запчастину. */
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Post(':vinCode/part-found')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Підбір запчастини за VIN (ADMIN, MECHANIC)',
    description:
      'Надсилає WebSocket-подію partFound у кімнату request_<VIN> та HTML-лист покупцю.',
  })
  @ApiParam({ name: 'vinCode', description: 'VIN-код (17 символів, A-Z та 0-9 без I, O, Q)', example: 'WVWZZZ1JZXW000001' })
  @ApiResponse({ status: 200, description: 'Сповіщення надіслано в кімнату та на пошту' })
  @ApiResponse({ status: 400, description: 'Невалідний VIN або тіло запиту', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Відсутній або недійсний JWT-токен', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Недостатньо прав (потрібна роль ADMIN або MECHANIC)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Запчастину не знайдено', type: ErrorResponseDto })
  @ApiResponse({ status: 503, description: 'Не вдалося відправити лист (SMTP / Mailpit недоступний)', type: ErrorResponseDto })
  partFound(
    @Param('vinCode', ParseVinPipe) vinCode: string,
    @Body() dto: PartFoundDto,
    @CurrentUser('email') managerEmail: string,
  ) {
    return this.notificationsService.notifyPartFound(vinCode, dto, managerEmail);
  }
}
