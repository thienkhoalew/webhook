import type { DeliverWebhookV1 } from '@webhook/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WebhookDeliveryOutbox } from '../entities/webhook-delivery-outbox.entity.js';
import { WebhookQueueService } from './webhook-queue.service.js';

@Injectable()
export class WebhookOutboxPublisher {
  private readonly logger = new Logger(WebhookOutboxPublisher.name);
  private publishing = false;

  constructor(
    @InjectRepository(WebhookDeliveryOutbox)
    private readonly outbox: Repository<WebhookDeliveryOutbox>,
    private readonly queue: WebhookQueueService,
  ) {}

  @Cron('*/5 * * * * *')
  async publishPending(): Promise<void> {
    if (this.publishing) return;
    this.publishing = true;

    try {
      const rows = await this.outbox.find({
        order: { createdAt: 'ASC' },
        take: 100,
      });
      for (const row of rows) {
        try {
          await this.queue.enqueue(row.command as unknown as DeliverWebhookV1);
        } catch (error) {
          this.logger.warn(
            `Outbox publish failed for attempt ${row.attemptId}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
          break;
        }
      }
    } finally {
      this.publishing = false;
    }
  }
}
