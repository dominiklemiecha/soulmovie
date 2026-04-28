import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { AppTypeOrmModule } from '../infra/typeorm/typeorm.module';
import { OutboxProcessor } from './outbox.processor';
import configuration from '../config/configuration';

initializeTransactionalContext();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    AppTypeOrmModule,
  ],
  providers: [OutboxProcessor],
})
export class WorkerModule {}
