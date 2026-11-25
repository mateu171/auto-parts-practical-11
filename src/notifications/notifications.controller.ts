import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';
import { Public } from '../auth/decorators/public.decorator';
import { EventsGateway } from './events.gateway';

@ApiTags('Сповіщення')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly eventsGateway: EventsGateway) {}

  /**
   * SSE-потік системних показників кожні 5 секунд.
   * Ендпоінт публічний, бо браузерний EventSource не вміє передавати
   * заголовок Authorization; дані потоку не містять чутливої інформації.
   */
  @Public()
  @Sse('events/stream')
  @ApiOperation({ summary: 'SSE-потік стану сервера (кожні 5 секунд)' })
  @ApiResponse({ status: 200, description: 'Потік text/event-stream: статус, uptime, кількість WebSocket-підключень' })
  stream(): Observable<MessageEvent> {
    return interval(5000).pipe(
      map((tick) => ({
        id: String(tick),
        data: {
          tick,
          status: 'OK',
          serverTime: new Date().toISOString(),
          uptimeSeconds: Math.round(process.uptime()),
          activeConnections: this.eventsGateway.getActiveConnections(),
        },
      })),
    );
  }
}
