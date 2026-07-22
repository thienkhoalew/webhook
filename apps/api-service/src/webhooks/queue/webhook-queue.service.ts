import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  DELIVER_WEBHOOK_JOB,
  WEBHOOK_DELIVERY_QUEUE,
  type DeliverWebhookV1,
} from '@webhook/contracts';

@Injectable()
export class WebhookQueueService {
  constructor(
    @InjectQueue(WEBHOOK_DELIVERY_QUEUE)
    private readonly deliveryQueue: Queue<DeliverWebhookV1>,
  ) {}

  enqueue(command: DeliverWebhookV1) {
    return this.deliveryQueue.add(DELIVER_WEBHOOK_JOB, command, {
      jobId: command.attemptId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  enqueueMany(commands: DeliverWebhookV1[]) {
    return Promise.all(commands.map((command) => this.enqueue(command)));
  }
}
