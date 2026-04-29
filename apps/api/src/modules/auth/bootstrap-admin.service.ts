import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Role, UserStatus } from '@soulmovie/shared';
import { User } from '../users/entities/user.entity';
import { PasswordService } from './password.service';

@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  private readonly log = new Logger(BootstrapAdminService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly password: PasswordService,
    private readonly cfg: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.cfg.get<string>('bootstrap.adminEmail');
    const pwd = this.cfg.get<string>('bootstrap.adminPassword');
    if (!email || !pwd) {
      this.log.warn('BOOTSTRAP_ADMIN_EMAIL/PASSWORD non configurati, skip bootstrap admin');
      return;
    }
    try {
      const repo = this.ds.getRepository(User);
      const exists = await repo.findOne({ where: { email } });
      if (exists) {
        this.log.log(`bootstrap admin già presente (${email})`);
        return;
      }
      await repo.insert({
        email,
        passwordHash: await this.password.hash(pwd),
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      });
      this.log.log(`bootstrap admin creato: ${email}`);
    } catch (e: any) {
      this.log.error(`bootstrap admin failed: ${e?.message ?? e}`);
    }
  }
}
