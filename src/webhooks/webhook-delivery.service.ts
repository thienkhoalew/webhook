import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { Repository } from 'typeorm';

import { WebhookDeliveryAttempt } from './entities/webhook-delivery-attempt.entity.js';
import { WebhookEvent } from './entities/webhook-event.entity.js';
import { WebhookDeliveryStatus, WebhookEventStatus } from './enums/webhook-status.enum.js';
import { ListDeliveryAttemptsDto } from './dto/list-delivery-attempts.dto.js';

@Injectable()
export class WebhookDeliveryService {
    constructor(
        @InjectRepository(WebhookDeliveryAttempt)
        private readonly deliveryAttemptRepository: Repository<WebhookDeliveryAttempt>,

        @InjectRepository(WebhookEvent)
        private readonly eventRepository: Repository<WebhookEvent>,
    ) { }

    private createSignature(body: string, secret: string): string {
        return createHmac('sha256', secret)
            .update(body)
            .digest('hex');
    }

    private getNextRetryAt(attemptNumber: number): Date | null {
        const delaysInMs = [60_000, 5 * 60_000, 30 * 60_000];
        const delay = delaysInMs[attemptNumber - 1];

        return delay ? new Date(Date.now() + delay) : null;
    }

    async deliverAttempts(attempts: WebhookDeliveryAttempt[]): Promise<(WebhookDeliveryAttempt | null)[]> {
        return Promise.all(
            attempts.map((attempt) => this.deliverAttempt(attempt.id)),
        );
    }

    async deliverAttempt(attemptId: string): Promise<WebhookDeliveryAttempt | null> {
        const attempt = await this.deliveryAttemptRepository.findOne({
            where: { id: attemptId },
            relations: {
                event: true,
                subscription: true,
            },
        });

        if (!attempt) {
            return null;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            const body = JSON.stringify({
                id: attempt.event.id,
                type: attempt.event.eventType,
                payload: attempt.event.payload,
                createdAt: attempt.event.createdAt,
            });

            const signature = this.createSignature(body, attempt.subscription.secret);

            const response = await fetch(attempt.subscription.url, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': attempt.event.eventType,
                    'X-Webhook-Event-Id': attempt.event.id,
                    'X-Webhook-Attempt-Id': attempt.id,
                    'X-Webhook-Signature': signature,
                },
                body,
            });

            const responseBody = await response.text();

            attempt.httpStatusCode = response.status;
            attempt.responseBody = responseBody.slice(0, 5000);

            if (response.ok) {
                attempt.status = WebhookDeliveryStatus.Success;
                attempt.errorMessage = null;
                attempt.deliveredAt = new Date();
                attempt.nextRetryAt = null;
            } else {
                const nextRetryAt = this.getNextRetryAt(attempt.attemptNumber);

                attempt.status = nextRetryAt ? WebhookDeliveryStatus.Retrying : WebhookDeliveryStatus.Failed;
                attempt.errorMessage = `Webhook endpoint returned HTTP ${response.status}`;
                attempt.deliveredAt = null;
                attempt.nextRetryAt = nextRetryAt;
            }

            const savedAttempt = await this.deliveryAttemptRepository.save(attempt);
            await this.updateEventStatus(savedAttempt.eventId);
            return savedAttempt;

        } catch (error) {
            const nextRetryAt = this.getNextRetryAt(attempt.attemptNumber);

            attempt.status = nextRetryAt ? WebhookDeliveryStatus.Retrying : WebhookDeliveryStatus.Failed;
            attempt.errorMessage = error instanceof Error
                ? error.message
                : 'Unknown delivery error';
            attempt.deliveredAt = null;
            attempt.nextRetryAt = nextRetryAt;

            const savedAttempt = await this.deliveryAttemptRepository.save(attempt);
            await this.updateEventStatus(savedAttempt.eventId);
            return savedAttempt;
        } finally {
            clearTimeout(timeout);
        }
    }

    async findDeliveryAttempts(query: ListDeliveryAttemptsDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const queryBuilder = this.deliveryAttemptRepository
            .createQueryBuilder('attempt')
            .orderBy('attempt.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (query.eventId) {
            queryBuilder.andWhere('attempt.eventId = :eventId', { eventId: query.eventId });
        }

        if (query.subscriptionId) {
            queryBuilder.andWhere('attempt.subscriptionId = :subscriptionId', { subscriptionId: query.subscriptionId });
        }

        if (query.status) {
            queryBuilder.andWhere('attempt.status = :status', { status: query.status });
        }

        const [items, total] = await queryBuilder.getManyAndCount();

        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findDueRetryAttempts(limit = 100): Promise<WebhookDeliveryAttempt[]> {
        return this.deliveryAttemptRepository
            .createQueryBuilder('attempt')
            .where('attempt.status = :status', { status: WebhookDeliveryStatus.Retrying })
            .andWhere('attempt.nextRetryAt <= :now', { now: new Date() })
            .orderBy('attempt.nextRetryAt', 'ASC')
            .limit(limit)
            .getMany();
    }

    async retryAttempt(attemptId: string): Promise<WebhookDeliveryAttempt | null> {
        const attempt = await this.deliveryAttemptRepository.findOne({
            where: { id: attemptId },
        });

        if (!attempt) {
            return null;
        }

        attempt.attemptNumber += 1;
        attempt.status = WebhookDeliveryStatus.Pending;
        attempt.nextRetryAt = null;

        await this.deliveryAttemptRepository.save(attempt);

        return this.deliverAttempt(attempt.id);
    }

    async refreshEventStatus(eventId: string): Promise<void> {
        await this.updateEventStatus(eventId);
    }

    private async updateEventStatus(eventId: string): Promise<void> {
        const attempts = await this.deliveryAttemptRepository.find({
            where: { eventId },
        });

        let status: WebhookEventStatus = WebhookEventStatus.NoSubscribers;

        if (attempts.length > 0) {
            const hasPendingOrRetrying = attempts.some((attempt) =>
                [
                    WebhookDeliveryStatus.Pending,
                    WebhookDeliveryStatus.Retrying
                ].includes(attempt.status),
            );

            const allSuccess = attempts.every((attempt) => attempt.status === WebhookDeliveryStatus.Success);

            if (allSuccess) {
                status = WebhookEventStatus.Delivered;
            } else if (hasPendingOrRetrying) {
                status = WebhookEventStatus.Processing;
            } else {
                status = WebhookEventStatus.Failed;
            }
        }

        await this.eventRepository.update(eventId, { status });
    }
}
