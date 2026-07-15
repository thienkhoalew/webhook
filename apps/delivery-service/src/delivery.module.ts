import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { DeliveryModule as DeliveryDomainModule } from './delivery/delivery.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DELIVERY_DB_HOST') ?? 'localhost',
        port: config.get<number>('DELIVERY_DB_PORT') ?? 5433,
        username:
          config.get<string>('DELIVERY_DB_USERNAME') ?? 'webhook_delivery_user',
        password:
          config.get<string>('DELIVERY_DB_PASSWORD') ??
          'webhook_delivery_password',
        database:
          config.get<string>('DELIVERY_DB_DATABASE') ?? 'webhook_delivery_db',
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    DeliveryDomainModule,
  ],
  controllers: [AppController],
})
export class DeliveryModule {}
