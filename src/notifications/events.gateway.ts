import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/** Кімната варіанта 7: request_<vinCode> (VIN — 17 символів, без I, O, Q). */
export const ROOM_PATTERN = /^request_[A-HJ-NPR-Z0-9]{17}$/;

export const buildRoomId = (vinCode: string): string =>
  `request_${vinCode.toUpperCase()}`;

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit(): void {
    this.logger.log('EventsGateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Клієнт підключився: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Клієнт відключився: ${client.id}`);
  }

  // ---------- Рівень 1: ping/pong та broadcast ----------

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('broadcastNotification')
  handleBroadcast(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: Socket,
  ): void {
    const message = typeof data === 'string' ? data.trim() : '';

    if (!message || message.length > 500) {
      throw new WsException('Повідомлення має бути рядком довжиною 1–500 символів');
    }

    this.server.emit('globalAlert', {
      sender: client.id,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // ---------- Рівень 2: кімнати ----------

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() body: { roomId?: unknown },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const roomId = this.validateRoom(body?.roomId);

    await client.join(roomId);
    this.logger.log(`Клієнт ${client.id} приєднався до кімнати: ${roomId}`);

    client.emit('joined', { status: 'success', roomId });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() body: { roomId?: unknown },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const roomId = this.validateRoom(body?.roomId);

    await client.leave(roomId);
    this.logger.log(`Клієнт ${client.id} покинув кімнату: ${roomId}`);

    client.emit('left', { status: 'success', roomId });
  }

  /** Надсилає подію лише сокетам кімнати. Повертає кількість отримувачів. */
  emitToRoom(roomId: string, event: string, data: unknown): number {
    this.server.to(roomId).emit(event, data);

    const recipients = this.server.sockets.adapter.rooms.get(roomId)?.size ?? 0;
    this.logger.log(
      `Сповіщення надіслано в кімнату ${roomId}: ${JSON.stringify({ event, recipients })}`,
    );

    return recipients;
  }

  getActiveConnections(): number {
    return this.server.sockets.sockets.size;
  }

  private validateRoom(roomId: unknown): string {
    if (typeof roomId !== 'string' || !ROOM_PATTERN.test(roomId)) {
      throw new WsException(
        'Невірна назва кімнати. Формат: request_<VIN із 17 символів>',
      );
    }

    return roomId;
  }
}
