import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WebhookDeliveryAttempt } from './entities/webhook-delivery-attempt.entity.js';

@Injectable()
export class WebhookDeliveryService {
    constructor(
        @InjectRepository(WebhookDeliveryAttempt)
        private readonly deliveryAttemptRepository: Repository<WebhookDeliveryAttempt>,
    ) {}

    async deliverAttempts(attempts: WebhookDeliveryAttempt[]) {
        return Promise.all(
            attempts.map((attempt) => this.deliverAttempt(attempt.id)),
        );
    }

    async deliverAttempt(attemptId: string) {
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

        try {
            const response = await fetch(attempt.subscription.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': attempt.event.eventType,
                    'X-Webhook-Event-Id': attempt.event.id,
                    'X-Webhook-Attempt-Id': attempt.id,
                },
                body: JSON.stringify({
                    id: attempt.event.id,
                    type: attempt.event.eventType,
                    payload: attempt.event.payload,
                    createdAt: attempt.event.createdAt,
                }),
            });

            const responseBody = await response.text();

            attempt.httpStatusCode = response.status;
            attempt.responseBody = responseBody.slice(0, 5000);
            attempt.deliveredAt = response.ok ? new Date() : null;
            attempt.status = response.ok ? 'success' : 'failed';
            attempt.errorMessage = response.ok
                ? null
                : `Webhook endpoint returned HTTP ${response.status}`;

            return this.deliveryAttemptRepository.save(attempt);
        } catch (error) {
            attempt.status = 'failed';
            attempt.errorMessage = error instanceof Error
                ? error.message
                : 'Unknown delivery error';
            attempt.deliveredAt = null;

            return this.deliveryAttemptRepository.save(attempt);
        }
    }
}
