import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  DELIVER_WEBHOOK_JOB,
  RETRY_WEBHOOK_JOB,
  WEBHOOK_DELIVERY_QUEUE,
  type DeliverWebhookV1,
} from '@webhook/contracts';

export interface RetryWebhookJob {
  attemptId: string;
}

type DeliveryQueueJob = DeliverWebhookV1 | RetryWebhookJob;

@Injectable()
export class DeliveryQueueService {
  constructor(
    @InjectQueue(WEBHOOK_DELIVERY_QUEUE)
    private readonly queue: Queue<DeliveryQueueJob>,
  ) {}

  enqueue(command: DeliverWebhookV1) {
    return this.queue.add(DELIVER_WEBHOOK_JOB, command, {
      jobId: command.attemptId,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  enqueueRetry(attemptId: string) {
    return this.queue.add(
      RETRY_WEBHOOK_JOB,
      { attemptId },
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
