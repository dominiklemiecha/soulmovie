import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import {
  ApprovalStatus,
  ErrorCodes,
  RegisterSelfDto,
  InviteSupplierDto,
  RegistrationSource,
  Role,
  UserStatus,
} from '@soulmovie/shared';
import { User } from '../users/entities/user.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { PasswordService } from './password.service';
import { TokensService } from './tokens.service';
import { MailService } from '../../infra/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly ds: DataSource,
    private readonly password: PasswordService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  @Transactional()
  async registerSelf(dto: RegisterSelfDto): Promise<void> {
    const userRepo = this.ds.getRepository(User);
    const supplierRepo = this.ds.getRepository(Supplier);
    const exists = await userRepo.findOne({ where: { email: dto.email } });
    if (exists) {
      throw new ConflictException({
        error: { code: ErrorCodes.EMAIL_ALREADY_REGISTERED, message: 'Email già registrata' },
      });
    }

    const supplier = await supplierRepo.save(
      supplierRepo.create({
        ragioneSociale: dto.ragioneSociale,
        registrationSource: RegistrationSource.SELF,
        approvalStatus: ApprovalStatus.PENDING,
      }),
    );

    const user = await userRepo.save(
      userRepo.create({
        email: dto.email,
        passwordHash: await this.password.hash(dto.password),
        role: Role.SUPPLIER,
        status: UserStatus.PENDING_EMAIL,
        supplierId: supplier.id,
      }),
    );

    const raw = await this.tokens.issueOneTime(user.id, 'email_verification', 24 * 60 * 60 * 1000);
    const link = `${this.cfg.get('webBaseUrl')}/verify-email?token=${raw}`;
    await this.mail.send({
      to: dto.email,
      subject: 'Verifica il tuo indirizzo email — Soulmovie',
      html: `<p>Ciao,</p><p>verifica la tua email cliccando: <a href="${link}">${link}</a></p><p>Il link scade in 24 ore.</p>`,
    });
  }

  @Transactional()
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.tokens.consumeOneTime(token, 'email_verification');
    await this.ds.getRepository(User).update(userId, {
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });
  }

  async login(email: string, password: string, ip?: string, ua?: string) {
    const userRepo = this.ds.getRepository(User);
    const supplierRepo = this.ds.getRepository(Supplier);
    const user = await userRepo.findOne({ where: { email } });
    if (!user || !(await this.password.verify(user.passwordHash, password))) {
      throw new UnauthorizedException({
        error: { code: ErrorCodes.AUTH_INVALID_CREDENTIALS, message: 'Credenziali non valide' },
      });
    }
    if (user.status !== UserStatus.ACTIVE) {
      const code =
        user.status === UserStatus.PENDING_EMAIL
          ? ErrorCodes.AUTH_EMAIL_NOT_VERIFIED
          : user.status === UserStatus.DISABLED
            ? ErrorCodes.AUTH_USER_DISABLED
            : ErrorCodes.AUTH_INVALID_CREDENTIALS;
      throw new UnauthorizedException({
        error: { code, message: 'Account non attivo' },
      });
    }
    if (user.role === Role.SUPPLIER && user.supplierId) {
      const sup = await supplierRepo.findOne({ where: { id: user.supplierId } });
      if (sup?.approvalStatus !== ApprovalStatus.APPROVED) {
        throw new UnauthorizedException({
          error: {
            code: ErrorCodes.AUTH_SUPPLIER_NOT_APPROVED,
            message: 'Account in attesa di approvazione',
          },
        });
      }
    }
    await userRepo.update(user.id, { lastLoginAt: new Date() });
    return this.issueTokens(user, ip, ua);
  }

  private async issueTokens(user: User, ip?: string, ua?: string) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      supplierId: user.supplierId,
    });
    const refresh = await this.tokens.issueRefresh(
      user.id,
      null,
      this.parseTtl(this.cfg.get('jwt.refreshTtl')!),
      ip,
      ua,
    );
    return {
      accessToken,
      refreshToken: refresh.raw,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        supplierId: user.supplierId,
      },
    };
  }

  async refresh(rawRefresh: string, ip?: string, ua?: string) {
    const ttl = this.parseTtl(this.cfg.get('jwt.refreshTtl')!);
    const rotated = await this.tokens.rotateRefresh(rawRefresh, ttl, ip, ua);
    const userRepo = this.ds.getRepository(User);
    const user = await userRepo.findOneOrFail({ where: { id: rotated.userId } });
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      supplierId: user.supplierId,
    });
    return {
      accessToken,
      refreshToken: rotated.raw,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        supplierId: user.supplierId,
      },
    };
  }

  async logout(userId: string) {
    await this.tokens.revokeAllForUser(userId);
  }

  @Transactional()
  async inviteSupplier(dto: InviteSupplierDto, invitedBy: string): Promise<void> {
    const userRepo = this.ds.getRepository(User);
    const supplierRepo = this.ds.getRepository(Supplier);
    const exists = await userRepo.findOne({ where: { email: dto.email } });
    if (exists) {
      throw new ConflictException({
        error: { code: ErrorCodes.EMAIL_ALREADY_REGISTERED, message: 'Email già registrata' },
      });
    }

    const supplier = await supplierRepo.save(
      supplierRepo.create({
        ragioneSociale: dto.ragioneSociale,
        registrationSource: RegistrationSource.INVITE,
        approvalStatus: ApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: invitedBy,
      }),
    );

    const user = await userRepo.save(
      userRepo.create({
        email: dto.email,
        passwordHash: 'pending-invite',
        role: Role.SUPPLIER,
        status: UserStatus.INVITED,
        supplierId: supplier.id,
      }),
    );

    const raw = await this.tokens.issueOneTime(user.id, 'invite', 7 * 24 * 60 * 60 * 1000);
    const link = `${this.cfg.get('webBaseUrl')}/accept-invite?token=${raw}`;
    await this.mail.send({
      to: dto.email,
      subject: 'Sei stato invitato su Soulmovie',
      html: `<p>Clicca per impostare la tua password e accedere: <a href="${link}">${link}</a></p><p>Link valido 7 giorni.</p>`,
    });
  }

  @Transactional()
  async acceptInvite(token: string, password: string): Promise<void> {
    const userId = await this.tokens.consumeOneTime(token, 'invite');
    await this.ds.getRepository(User).update(userId, {
      passwordHash: await this.password.hash(password),
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.ds.getRepository(User).findOne({ where: { email } });
    if (!user) return;
    const raw = await this.tokens.issueOneTime(user.id, 'password_reset', 60 * 60 * 1000);
    const link = `${this.cfg.get('webBaseUrl')}/reset-password?token=${raw}`;
    await this.mail.send({
      to: email,
      subject: 'Reset password Soulmovie',
      html: `<p>Reset password: <a href="${link}">${link}</a> (valido 1 ora)</p>`,
    });
  }

  @Transactional()
  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.tokens.consumeOneTime(token, 'password_reset');
    await this.ds.getRepository(User).update(userId, {
      passwordHash: await this.password.hash(password),
    });
    await this.tokens.revokeAllForUser(userId);
  }

  private parseTtl(s: string): number {
    const m = s.match(/^(\d+)([smhd])$/);
    if (!m) throw new Error('invalid TTL');
    const n = parseInt(m[1], 10);
    const mult: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return n * mult[m[2]];
  }
}
