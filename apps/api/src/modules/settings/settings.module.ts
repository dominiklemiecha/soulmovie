import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SystemSetting } from './entities/system-setting.entity';
import { SettingsService } from './settings.service';
import { CryptoService } from '../../infra/crypto/crypto.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  providers: [
    SettingsService,
    {
      provide: CryptoService,
      useFactory: (cfg: ConfigService) => new CryptoService(cfg.get('settings.encryptionKey')!),
      inject: [ConfigService],
    },
  ],
  exports: [SettingsService, CryptoService],
})
export class SettingsModule {}
