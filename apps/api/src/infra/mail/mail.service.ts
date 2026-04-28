import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { SettingsService } from '../../modules/settings/settings.service';

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  constructor(
    private readonly cfg: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private async getTransporter(): Promise<Transporter> {
    const smtp = await this.settings.getSmtp().catch(() => null);
    if (smtp) {
      return nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.tls,
        auth: { user: smtp.user, pass: smtp.password },
      });
    }
    return nodemailer.createTransport({
      host: this.cfg.get('mail.devHost') ?? 'localhost',
      port: this.cfg.get<number>('mail.devPort') ?? 1025,
      secure: false,
      ignoreTLS: true,
    });
  }

  async send(args: SendArgs): Promise<void> {
    const tx = await this.getTransporter();
    const smtp = await this.settings.getSmtp().catch(() => null);
    const from = smtp?.from ?? 'noreply@soulmovie.local';
    await tx.sendMail({ from, ...args });
    this.log.log(`mail sent to=${args.to} subject="${args.subject}"`);
  }
}
