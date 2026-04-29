import { Body, Controller, Get, HttpCode, Post, Put, UseGuards } from '@nestjs/common';
import {
  Role,
  SmtpSettingsDto,
  SmtpTestDto,
  smtpSettingsSchema,
  smtpTestSchema,
} from '@soulmovie/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../../infra/mail/mail.service';

@Controller('admin/settings')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly mail: MailService,
  ) {}

  @Get('smtp')
  async getSmtp() {
    const cur = await this.settings.getSmtp();
    if (!cur) return null;
    return { ...cur, password: cur.password ? '••••••••' : '' };
  }

  @Put('smtp')
  async setSmtp(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(smtpSettingsSchema as any)) dto: SmtpSettingsDto,
  ) {
    // Se la password arriva come placeholder mascherato, conserva quella esistente
    const cur = await this.settings.getSmtp();
    if (dto.password === '••••••••' && cur) {
      dto.password = cur.password;
    }
    await this.settings.setSmtp(dto, user.id);
    return { ok: true };
  }

  @Post('smtp/test')
  @HttpCode(200)
  async test(@Body(new ZodValidationPipe(smtpTestSchema)) dto: SmtpTestDto) {
    await this.mail.send({
      to: dto.to,
      subject: 'Test SMTP — Soulmovie',
      html: `<p>Questo è un messaggio di prova inviato dal pannello admin di Soulmovie.</p><p>Se lo stai leggendo, la configurazione SMTP funziona.</p>`,
    });
    return { ok: true };
  }
}
