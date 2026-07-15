import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WEBHOOK_DELIVERY_QUEUE } from '@webhook/contracts';
import { DeliveryAttemptService } from './delivery-attempt.service.js';
import { DeliveryAttempt } from './entities/delivery-attempt.entity.js';
import { InternalDeliveryController } from './internal-delivery.controller.js';
import { InternalServiceTokenGuard } from './internal-service-token.guard.js';
import { DeliveryProcessor } from './queue/delivery.processor.js';
import { DeliveryQueueService } from './queue/delivery-queue.service.js';
import { RetrySchedulerService } from './retry-scheduler.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryAttempt]),
    BullModule.registerQueue({ name: WEBHOOK_DELIVERY_QUEUE }),
  ],
  controllers: [InternalDeliveryController],
  providers: [
    DeliveryAttemptService,
    DeliveryQueueService,
    DeliveryProcessor,
    RetrySchedulerService,
    InternalServiceTokenGuard,
  ],
})
export class DeliveryModule {}
