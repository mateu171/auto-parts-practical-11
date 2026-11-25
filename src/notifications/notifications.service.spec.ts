import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EventsGateway } from './events.gateway';
import { MailService } from '../mail/mail.service';
import { PartsService } from '../parts/parts.service';

const VIN = 'WVWZZZ1JZXW000001';
const dto = {
  partId: 'ef2d9ccd-70f8-4fd7-bd25-54b7edd4537d',
  customerEmail: 'client@example.com',
  managerComment: 'Є в наявності',
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let gateway: { emitToRoom: jest.Mock };
  let mail: { sendNotificationEmail: jest.Mock };
  let parts: { findOneWithRelations: jest.Mock };

  beforeEach(async () => {
    gateway = { emitToRoom: jest.fn().mockReturnValue(1) };
    mail = { sendNotificationEmail: jest.fn().mockResolvedValue('<id>') };
    parts = {
      findOneWithRelations: jest.fn().mockResolvedValue({
        id: dto.partId,
        title: 'Гальмівні колодки',
        oemCode: '1K0698151A',
        condition: 'NEW',
        price: 1850,
        carBrand: 'Volkswagen',
        carModel: { name: 'Golf 7' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: EventsGateway, useValue: gateway },
        { provide: MailService, useValue: mail },
        { provide: PartsService, useValue: parts },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('надсилає подію partFound у кімнату та лист покупцю', async () => {
    const result = await service.notifyPartFound(VIN, dto, 'manager@test.com');

    expect(gateway.emitToRoom).toHaveBeenCalledWith(
      `request_${VIN}`,
      'partFound',
      expect.objectContaining({ event: 'partFound', vinCode: VIN }),
    );
    expect(mail.sendNotificationEmail).toHaveBeenCalledWith(
      dto.customerEmail,
      expect.stringContaining(VIN),
      expect.any(String),
    );
    expect(result).toEqual(
      expect.objectContaining({ success: true, room: `request_${VIN}`, websocketRecipients: 1 }),
    );
  });

  it('кидає ServiceUnavailableException, якщо лист не вдалося відправити', async () => {
    mail.sendNotificationEmail.mockRejectedValue(new Error('SMTP down'));

    await expect(
      service.notifyPartFound(VIN, dto, 'manager@test.com'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('пробрасує NotFoundException і нічого не надсилає, якщо запчастини немає', async () => {
    parts.findOneWithRelations.mockRejectedValue(new NotFoundException());

    await expect(
      service.notifyPartFound(VIN, dto, 'manager@test.com'),
    ).rejects.toThrow(NotFoundException);
    expect(gateway.emitToRoom).not.toHaveBeenCalled();
    expect(mail.sendNotificationEmail).not.toHaveBeenCalled();
  });
});

