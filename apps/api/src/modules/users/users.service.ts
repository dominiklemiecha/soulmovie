import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { ChangeEmailDto, ChangePasswordDto, ErrorCodes, UserStatus } from '@soulmovie/shared';
import { User } from './entities/user.entity';
import { PasswordService } from '../auth/password.service';
import { TokensService } from '../auth/tokens.service';
import { MailService } from '../../infra/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly ds: DataSource,
    private readonly password: PasswordService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
    private readonly cfg: ConfigService,
  ) {}

  async getMe(userId: string) {
    const u = await this.ds.getRepository(User).findOne({ where: { id: userId } });
    if (!u) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Utente non trovato' },
      });
    }
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      supplierId: u.supplierId,
      emailVerifiedAt: u.emailVerifiedAt,
      lastLoginAt: u.lastLoginAt,
    };
  }

  @Transactional()
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const repo = this.ds.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Utente non trovato' },
      });
    }
    if (!(await this.password.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException({
        error: { code: ErrorCodes.PASSWORD_INCORRECT, message: 'Password attuale errata' },
      });
    }
    user.passwordHash = await this.password.hash(dto.newPassword);
    user.updatedAt = new Date();
    await repo.save(user);
    await this.tokens.revokeAllForUser(userId);
  }

  @Transactional()
  async changeEmail(userId: string, dto: ChangeEmailDto): Promise<void> {
    const repo = this.ds.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Utente non trovato' },
      });
    }
    if (!(await this.password.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException({
        error: { code: ErrorCodes.PASSWORD_INCORRECT, message: 'Password errata' },
      });
    }
    if (user.email === dto.newEmail) return;
    const exists = await repo.findOne({ where: { email: dto.newEmail } });
    if (exists) {
      throw new ConflictException({
        error: { code: ErrorCodes.EMAIL_ALREADY_REGISTERED, message: 'Email già in uso' },
      });
    }
    user.email = dto.newEmail;
    user.status = UserStatus.PENDING_EMAIL;
    user.emailVerifiedAt = null;
    user.updatedAt = new Date();
    await repo.save(user);

    const raw = await this.tokens.issueOneTime(user.id, 'email_verification', 24 * 60 * 60 * 1000);
    const link = `${this.cfg.get('webBaseUrl')}/verify-email?token=${raw}`;
    await this.mail.send({
      to: dto.newEmail,
      subject: 'Conferma il nuovo indirizzo email — Soulmovie',
      html: `<p>Ciao,</p><p>conferma la nuova email cliccando: <a href="${link}">${link}</a></p><p>Il link scade in 24 ore.</p>`,
    });
    await this.tokens.revokeAllForUser(userId);
  }
}
