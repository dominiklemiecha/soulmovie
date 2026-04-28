import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { initializeTransactionalContext } from 'typeorm-transactional';
import configuration from './config/configuration';
import { AppTypeOrmModule } from './infra/typeorm/typeorm.module';
import { TransactionalDb } from './infra/typeorm/transactional-db.service';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MailModule } from './infra/mail/mail.module';
import { HealthModule } from './modules/health/health.module';

initializeTransactionalContext();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    AppTypeOrmModule,
    SettingsModule,
    MailModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    TransactionalDb,
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [TransactionalDb],
})
export class AppModule {}
