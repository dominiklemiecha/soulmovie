import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('database.host'),
        port: cfg.get('database.port'),
        username: cfg.get('database.user'),
        password: cfg.get('database.password'),
        database: cfg.get('database.database'),
        autoLoadEntities: true,
        synchronize: false,
        extra: { max: 20 },
      }),
      dataSourceFactory: async (options) => {
        const ds = await new DataSource(options!).initialize();
        addTransactionalDataSource(ds);
        return ds;
      },
    }),
  ],
})
export class AppTypeOrmModule {}
