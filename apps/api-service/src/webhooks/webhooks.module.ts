import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WEBHOOK_DELIVERY_QUEUE } from '@webhook/contracts';
import { DeliveryClientModule } from '../delivery-client/delivery-client.module.js';
import { WebhookEvent } from './entities/webhook-event.entity.js';
import { WebhookSubscription } from './entities/webhook-subscription.entity.js';
import { WebhookQueueService } from './queue/webhook-queue.service.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookEvent]),
    BullModule.registerQueue({ name: WEBHOOK_DELIVERY_QUEUE }),
    DeliveryClientModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookQueueService],
})
export class WebhooksModule {}
