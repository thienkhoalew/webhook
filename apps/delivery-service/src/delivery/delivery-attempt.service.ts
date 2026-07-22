import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'node:crypto';
import { In, LessThanOrEqual, MoreThan, Repository } from 'typeorm';

import type {
  DeliverWebhookV1,
  DeliveryAttemptResponse,
  DeliveryEventSummaryResponse,
  PaginatedDeliveryAttemptsResponse,
} from '@webhook/contracts';
import { DeliveryAttempt } from './entities/delivery-attempt.entity.js';
import { InternalListDeliveryAttemptsDto } from './dto/internal-list-delivery-attempts.dto.js';
import { getNextRetryAt } from './retry-policy.js';
import { SafeWebhookHttpClient } from './safe-webhook-http.client.js';

@Injectable()
export class DeliveryAttemptService {
  constructor(
    @InjectRepository(DeliveryAttempt)
    private readonly repository: Repository<DeliveryAttempt>,
    private readonly http: SafeWebhookHttpClient,
  ) {}

  async upsertFromCommand(command: DeliverWebhookV1): Promise<DeliveryAttempt> {
    const attempt = this.repository.create({
      id: command.attemptId,
      userId: command.event.userId,
      eventId: command.event.id,
      subscriptionId: command.subscription.id,
      eventType: command.event.type,
      payloadSnapshot: command.event.payload,
      eventCreatedAt: new Date(command.event.createdAt),
      targetUrl: command.subscription.url,
      secretSnapshot: command.subscription.secret,
      status: 'pending',
      attemptNumber: 1,
    });

    await this.repository
      .createQueryBuilder()
      .insert()
      .into(DeliveryAttempt)
      .values(attempt)
      .orIgnore()
      .execute();

    return this.getEntity(command.attemptId);
  }

  async deliver(attemptId: string): Promise<DeliveryAttemptResponse> {
    const attempt = await this.getEntity(attemptId);
    if (attempt.status === 'success') {
      return this.toResponse(attempt);
    }

    const body = JSON.stringify({
      id: attempt.eventId,
      type: attempt.eventType,
      payload: attempt.payloadSnapshot,
      createdAt: attempt.eventCreatedAt.toISOString(),
    });
    try {
      const signature = createHmac('sha256', attempt.secretSnapshot)
        .update(body)
        .digest('hex');
      const response = await this.http.post(
        attempt.targetUrl,
        {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(body)),
          'X-Webhook-Event': attempt.eventType,
          'X-Webhook-Event-Id': attempt.eventId,
          'X-Webhook-Attempt-Id': attempt.id,
          'X-Webhook-Signature': signature,
        },
        body,
      );

      attempt.httpStatusCode = response.statusCode;
      attempt.responseBody = response.body;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        attempt.status = 'success';
        attempt.errorMessage = null;
        attempt.deliveredAt = new Date();
        attempt.nextRetryAt = null;
      } else {
        this.markFailedAttempt(
          attempt,
          `Webhook endpoint returned HTTP ${response.statusCode}`,
        );
      }
    } catch (error) {
      this.markFailedAttempt(
        attempt,
        error instanceof Error ? error.message : 'Unknown delivery error',
      );
    }

    return this.toResponse(await this.repository.save(attempt));
  }

  async findAttempts(
    query: InternalListDeliveryAttemptsDto,
  ): Promise<PaginatedDeliveryAttemptsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const queryBuilder = this.repository
      .createQueryBuilder('attempt')
      .orderBy('attempt.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.userId) {
      queryBuilder.andWhere('attempt.userId = :userId', {
        userId: query.userId,
      });
    }
    if (query.eventId) {
      queryBuilder.andWhere('attempt.eventId = :eventId', {
        eventId: query.eventId,
      });
    }
    if (query.subscriptionId) {
      queryBuilder.andWhere('attempt.subscriptionId = :subscriptionId', {
        subscriptionId: query.subscriptionId,
      });
    }
    if (query.status) {
      queryBuilder.andWhere('attempt.status = :status', {
        status: query.status,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();
    return {
      items: items.map((attempt) => this.toResponse(attempt)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async assertRetryable(attemptId: string): Promise<DeliveryAttemptResponse> {
    const attempt = await this.getEntity(attemptId);
    if (!['failed', 'retrying'].includes(attempt.status)) {
      throw new BadRequestException(`Attempt ${attemptId} is not retryable`);
    }
    return this.toResponse(attempt);
  }

  async claimRetry(
    attemptId: string,
    expectedAttemptNumber: number,
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(DeliveryAttempt)
      .set({
        attemptNumber: expectedAttemptNumber,
        status: 'pending',
        nextRetryAt: null,
      })
      .where('id = :attemptId', { attemptId })
      .andWhere('attempt_number = :previousAttemptNumber', {
        previousAttemptNumber: expectedAttemptNumber - 1,
      })
      .andWhere('status IN (:...statuses)', {
        statuses: ['failed', 'retrying'],
      })
      .execute();
    if (result.affected) return true;

    const attempt = await this.getEntity(attemptId);
    return (
      attempt.status === 'pending' &&
      attempt.attemptNumber === expectedAttemptNumber
    );
  }

  async summarizeEvents(
    eventIds: string[],
  ): Promise<DeliveryEventSummaryResponse> {
    const rows = await this.repository
      .createQueryBuilder('attempt')
      .select('attempt.eventId', 'eventId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE attempt.status = 'pending')`,
        'pending',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE attempt.status = 'retrying')`,
        'retrying',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE attempt.status = 'success')`,
        'success',
      )
      .addSelect(`COUNT(*) FILTER (WHERE attempt.status = 'failed')`, 'failed')
      .where({ eventId: In(eventIds) })
      .groupBy('attempt.eventId')
      .getRawMany<Record<string, string>>();

    return {
      items: rows.map((row) => ({
        eventId: row.eventId,
        total: Number(row.total),
        pending: Number(row.pending),
        retrying: Number(row.retrying),
        success: Number(row.success),
        failed: Number(row.failed),
      })),
    };
  }

  findDueRetries(limit = 100): Promise<DeliveryAttempt[]> {
    const now = new Date();
    const stalePending = new Date(now.getTime() - 60_000);
    return this.repository.find({
      where: [
        {
          status: 'retrying',
          nextRetryAt: LessThanOrEqual(now),
        },
        {
          status: 'pending',
          attemptNumber: MoreThan(1),
          updatedAt: LessThanOrEqual(stalePending),
        },
      ],
      order: { updatedAt: 'ASC' },
      take: limit,
    });
  }

  private markFailedAttempt(attempt: DeliveryAttempt, message: string): void {
    const nextRetryAt = getNextRetryAt(attempt.attemptNumber);
    attempt.status = nextRetryAt ? 'retrying' : 'failed';
    attempt.errorMessage = message;
    attempt.deliveredAt = null;
    attempt.nextRetryAt = nextRetryAt;
  }

  private async getEntity(id: string): Promise<DeliveryAttempt> {
    const attempt = await this.repository.findOneBy({ id });
    if (!attempt) {
      throw new NotFoundException(`Delivery attempt ${id} not found`);
    }
    return attempt;
  }

  private toResponse(attempt: DeliveryAttempt): DeliveryAttemptResponse {
    return {
      id: attempt.id,
      userId: attempt.userId,
      eventId: attempt.eventId,
      subscriptionId: attempt.subscriptionId,
      eventType: attempt.eventType,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      httpStatusCode: attempt.httpStatusCode,
      responseBody: attempt.responseBody,
      errorMessage: attempt.errorMessage,
      nextRetryAt: attempt.nextRetryAt?.toISOString() ?? null,
      deliveredAt: attempt.deliveredAt?.toISOString() ?? null,
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    };
  }
}
