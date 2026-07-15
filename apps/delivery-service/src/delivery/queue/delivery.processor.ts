import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import {
  DELIVER_WEBHOOK_JOB,
  RETRY_WEBHOOK_JOB,
  WEBHOOK_DELIVERY_QUEUE,
  isDeliverWebhookV1,
  type DeliverWebhookV1,
} from '@webhook/contracts';
import { DeliveryAttemptService } from '../delivery-attempt.service.js';
import type { RetryWebhookJob } from './delivery-queue.service.js';

@Processor(WEBHOOK_DELIVERY_QUEUE)
export class DeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(DeliveryProcessor.name);

  constructor(private readonly attempts: DeliveryAttemptService) {
    super();
  }

  async process(job: Job<DeliverWebhookV1 | RetryWebhookJob>): Promise<void> {
    if (job.name === DELIVER_WEBHOOK_JOB) {
      if (!isDeliverWebhookV1(job.data)) {
        throw new Error('Unsupported or invalid delivery command version');
      }
      const attempt = await this.attempts.upsertFromCommand(job.data);
      await this.attempts.deliver(attempt.id);
      return;
    }

    if (job.name === RETRY_WEBHOOK_JOB && this.isRetryJob(job.data)) {
      await this.attempts.deliver(job.data.attemptId);
      return;
    }

    this.logger.warn(`Ignored unknown delivery job ${job.name}`);
  }

  private isRetryJob(value: unknown): value is RetryWebhookJob {
    return (
      !!value &&
      typeof value === 'object' &&
      typeof (value as RetryWebhookJob).attemptId === 'string'
    );
  }
}
