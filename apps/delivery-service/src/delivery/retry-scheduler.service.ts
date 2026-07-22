import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { DeliveryAttemptService } from './delivery-attempt.service.js';
import { DeliveryQueueService } from './queue/delivery-queue.service.js';

@Injectable()
export class RetrySchedulerService {
  private readonly logger = new Logger(RetrySchedulerService.name);

  constructor(
    private readonly attempts: DeliveryAttemptService,
    private readonly queue: DeliveryQueueService,
  ) {}

  @Cron('*/30 * * * * *')
  async enqueueDueRetries(): Promise<void> {
    const due = await this.attempts.findDueRetries(100);
    for (const attempt of due) {
      try {
        await this.queue.enqueueRetry(
          attempt.id,
          attempt.status === 'retrying'
            ? attempt.attemptNumber + 1
            : attempt.attemptNumber,
        );
      } catch (error) {
        this.logger.warn(
          `Retry enqueue failed for attempt ${attempt.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
  }
}
