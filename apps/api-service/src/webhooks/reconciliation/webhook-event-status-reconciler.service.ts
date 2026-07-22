import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DeliveryServiceClient } from '../../delivery-client/delivery-service.client.js';
import { WebhookDeliveryOutbox } from '../entities/webhook-delivery-outbox.entity.js';
import { WebhookEvent } from '../entities/webhook-event.entity.js';
import { WebhookEventStatus } from '../enums/webhook-status.enum.js';

@Injectable()
export class WebhookEventStatusReconciler {
  private readonly logger = new Logger(WebhookEventStatusReconciler.name);
  private reconciling = false;

  constructor(
    @InjectRepository(WebhookEvent)
    private readonly events: Repository<WebhookEvent>,
    @InjectRepository(WebhookDeliveryOutbox)
    private readonly outbox: Repository<WebhookDeliveryOutbox>,
    private readonly deliveryClient: DeliveryServiceClient,
  ) {}

  @Cron('*/30 * * * * *')
  async reconcile(): Promise<void> {
    if (this.reconciling) return;
    this.reconciling = true;

    try {
      const events = await this.events
        .createQueryBuilder('event')
        .where('event.status IN (:...statuses)', {
          statuses: [WebhookEventStatus.Processing, WebhookEventStatus.Failed],
        })
        .andWhere('event.expectedDeliveryCount IS NOT NULL')
        .orderBy('event.updatedAt', 'ASC')
        .take(100)
        .getMany();
      if (events.length === 0) return;

      const response = await this.deliveryClient.summarizeEvents(
        events.map((event) => event.id),
      );
      const summaries = new Map(
        response.items.map((summary) => [summary.eventId, summary]),
      );
      const terminalEventIds = events
        .filter((event) => {
          const summary = summaries.get(event.id);
          return (
            summary?.total === event.expectedDeliveryCount &&
            summary.pending === 0 &&
            summary.retrying === 0
          );
        })
        .map((event) => event.id);
      if (terminalEventIds.length > 0) {
        await this.outbox
          .createQueryBuilder()
          .delete()
          .from(WebhookDeliveryOutbox)
          .where('event_id IN (:...eventIds)', { eventIds: terminalEventIds })
          .execute();
      }

      for (const event of events) {
        const summary = summaries.get(event.id);
        if (!summary || summary.total < event.expectedDeliveryCount!) {
          await this.touch(event.id, event.status);
          continue;
        }

        let status: WebhookEventStatus | undefined;
        if (summary.success === event.expectedDeliveryCount) {
          status = WebhookEventStatus.Delivered;
        } else if (
          event.status === WebhookEventStatus.Processing &&
          summary.pending === 0 &&
          summary.retrying === 0 &&
          summary.failed > 0
        ) {
          status = WebhookEventStatus.Failed;
        }
        if (!status) {
          await this.touch(event.id, event.status);
          continue;
        }

        await this.events
          .createQueryBuilder()
          .update(WebhookEvent)
          .set({ status })
          .where('id = :id', { id: event.id })
          .andWhere('status = :currentStatus', {
            currentStatus: event.status,
          })
          .execute();
      }
    } catch (error) {
      this.logger.warn(
        `Event reconciliation failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    } finally {
      this.reconciling = false;
    }
  }

  private async touch(
    eventId: string,
    status: WebhookEventStatus,
  ): Promise<void> {
    await this.events
      .createQueryBuilder()
      .update(WebhookEvent)
      .set({ updatedAt: new Date() })
      .where('id = :eventId', { eventId })
      .andWhere('status = :status', { status })
      .execute();
  }
}
