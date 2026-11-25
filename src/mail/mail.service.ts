import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    ignoreTLS: true,
  });

  async sendNotificationEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<string> {
    const info = await this.transporter.sendMail({
      from: '"AutoParts Store" <no-reply@autoparts.local>',
      to,
      subject,
      html: htmlContent,
    });

    this.logger.log(
      `Лист успішно надіслано на адресу ${to} (Message ID: ${info.messageId})`,
    );

    return info.messageId;
  }
}
