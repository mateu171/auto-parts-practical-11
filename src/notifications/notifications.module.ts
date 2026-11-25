import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PartsModule } from '../parts/parts.module';
import { EventsGateway } from './events.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PartRequestsController } from './part-requests.controller';

@Module({
  imports: [MailModule, PartsModule],
  controllers: [NotificationsController, PartRequestsController],
  providers: [EventsGateway, NotificationsService],
  exports: [EventsGateway],
})
export class NotificationsModule {}
