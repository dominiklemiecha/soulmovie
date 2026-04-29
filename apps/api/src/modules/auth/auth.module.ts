import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { OneTimeToken } from './entities/one-time-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { PasswordService } from './password.service';
import { JwtStrategy } from './jwt.strategy';
import { BootstrapAdminService } from './bootstrap-admin.service';
import { MailModule } from '../../infra/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Supplier, OneTimeToken, RefreshToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('jwt.accessSecret'),
        signOptions: { expiresIn: cfg.get('jwt.accessTtl') },
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, PasswordService, JwtStrategy, BootstrapAdminService],
  exports: [AuthService, TokensService, PasswordService],
})
export class AuthModule {}
