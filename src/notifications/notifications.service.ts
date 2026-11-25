import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { renderPartFoundEmail } from '../mail/templates/part-found.template';
import { PartsService } from '../parts/parts.service';
import { PartFoundDto } from '../dto/part-found.dto';
import { EventsGateway, buildRoomId } from './events.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly mailService: MailService,
    private readonly partsService: PartsService,
  ) {}

  /** Комплексний сценарій: WebSocket-подія partFound у кімнату + HTML-лист покупцю. */
  async notifyPartFound(vinCode: string, dto: PartFoundDto, managerEmail: string) {
    const part = await this.partsService.findOneWithRelations(dto.partId);

    const roomId = buildRoomId(vinCode);
    const carLabel = `${part.carBrand} ${part.carModel?.name ?? ''}`.trim();

    const payload = {
      event: 'partFound',
      vinCode,
      part: {
        id: part.id,
        title: part.title,
        oemCode: part.oemCode,
        condition: part.condition,
        price: part.price,
        car: carLabel,
      },
      managerComment: dto.managerComment ?? null,
      foundBy: managerEmail,
      timestamp: new Date().toISOString(),
    };

    const recipients = this.eventsGateway.emitToRoom(roomId, 'partFound', payload);

    const html = renderPartFoundEmail({
      vinCode,
      partTitle: part.title,
      oemCode: part.oemCode,
      carLabel,
      condition: part.condition === 'NEW' ? 'Нова' : 'Відновлена',
      price: part.price,
      managerComment: dto.managerComment,
      buttonUrl: `http://localhost:3000/parts/${part.id}`,
    });

    try {
      await this.mailService.sendNotificationEmail(
        dto.customerEmail,
        `Результати підбору запчастини за VIN ${vinCode}`,
        html,
      );
    } catch (error) {
      this.logger.error(`Не вдалося надіслати лист: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'WebSocket-сповіщення надіслано, але лист не відправлено (перевірте SMTP/Mailpit)',
      );
    }

    return {
      success: true,
      message: 'Запчастину підібрано, сповіщення надіслано в кімнату та на пошту',
      room: roomId,
      websocketRecipients: recipients,
    };
  }
}
