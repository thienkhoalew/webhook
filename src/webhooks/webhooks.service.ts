import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateWebhookDto } from "./dto/create-webhook.dto.js";
import { randomBytes, randomUUID } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { ArrayContains, DataSource, Repository } from "typeorm";
import { WebhookSubscription } from "./entities/webhook-subscription.entity.js";
import { WebhookEvent } from "./entities/webhook-event.entity.js";
import { WebhookDeliveryAttempt } from "./entities/webhook-delivery-attempt.entity.js";
import { UpdateWebhookDto } from "./dto/update-webhook.dto.js";
import { WebhookDeliveryService } from "./webhook-delivery.service.js";
import { WebhookDeliveryStatus, WebhookEventStatus } from "./enums/webhook-status.enum.js";
import { ListWebhookEventsDto } from "./dto/list-webhook-events.dto.js";

@Injectable()
export class WebhooksService {

    constructor(
        @InjectRepository(WebhookSubscription)
        private readonly subscriptionRepository: Repository<WebhookSubscription>,

        @InjectRepository(WebhookEvent)
        private readonly eventRepository: Repository<WebhookEvent>,

        @InjectRepository(WebhookDeliveryAttempt)
        private readonly deliveryAttemptRepository: Repository<WebhookDeliveryAttempt>,

        private readonly webhookDeliveryService: WebhookDeliveryService,

        private readonly dataSource: DataSource,
    ) { }

    async createSubscription(dto: CreateWebhookDto) {
        const webhook = this.subscriptionRepository.create({
            url: dto.url,
            eventTypes: dto.eventTypes,
            description: dto.description ?? null,
            secret: dto.secret ?? this.generateWebhookSecret(),
            isActive: true,
        });

        const savedWebhook = await this.subscriptionRepository.save(webhook);
        return this.sanitizeCreatedSubscription(savedWebhook);
    }

    async createDeliveryAttemptsForEvent(event: WebhookEvent) {
        const subscriptions = await this.findActiveSubscriptionsForEvent(event.eventType);

        const attempts = subscriptions.map((subscription) =>
            this.deliveryAttemptRepository.create({
                eventId: event.id,
                subscriptionId: subscription.id,
                status: WebhookDeliveryStatus.Pending,
                attemptNumber: 1,
            }),
        );

        return this.deliveryAttemptRepository.save(attempts);
    }

    async findAllSubscriptions() {
        const subscriptions = await this.subscriptionRepository.find({
            order: {
                createdAt: "DESC",
            },
        });

        return this.sanitizeSubscriptions(subscriptions);
    }

    async findSubscriptionById(id: string) {
        const webhook = await this.findSubscriptionEntityById(id);
        return this.sanitizeSubscription(webhook);
    }

    async updateSubscription(id: string, dto: UpdateWebhookDto) {
        if (Object.keys(dto).length === 0) {
            throw new BadRequestException('Update body must contain at least one field');
        }

        const webhook = await this.findSubscriptionEntityById(id);
        Object.assign(webhook, dto, { updatedAt: new Date() });
        const savedWebhook = await this.subscriptionRepository.save(webhook);
        return this.sanitizeSubscription(savedWebhook);
    }

    async removeSubscription(id: string) {
        const webhook = await this.findSubscriptionEntityById(id);
        await this.subscriptionRepository.remove(webhook);
        return this.sanitizeSubscription(webhook);
    }

    async createEvent(eventType: string, payload: Record<string, unknown>) {
        const event = this.eventRepository.create({
            eventType,
            payload,
            status: WebhookEventStatus.Pending,
        });

        return this.eventRepository.save(event);
    }

    async findEvents(query: ListWebhookEventsDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const queryBuilder = this.eventRepository
            .createQueryBuilder('event')
            .orderBy('event.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (query.status) {
            queryBuilder.andWhere('event.status = :status', { status: query.status });
        }

        if (query.eventType) {
            queryBuilder.andWhere('event.eventType = :eventType', { eventType: query.eventType });
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

    async findActiveSubscriptionsForEvent(eventType: string) {
        return this.subscriptionRepository.find({
            where: {
                isActive: true,
                eventTypes: ArrayContains([eventType]),
            },
        });
    }

    async createEventWithDeliveryAttempts(
        eventType: string,
        payload: Record<string, unknown>,
    ) {
        const result = await this.dataSource.transaction(async (manager) => {
            const eventRepository = manager.getRepository(WebhookEvent);
            const deliveryAttemptRepository = manager.getRepository(WebhookDeliveryAttempt);
            const subscriptionRepository = manager.getRepository(WebhookSubscription);

            const event = eventRepository.create({
                eventType,
                payload,
                status: WebhookEventStatus.Pending,
            });

            const savedEvent = await eventRepository.save(event);

            const subscriptions = await subscriptionRepository.find({
                where: {
                    isActive: true,
                    eventTypes: ArrayContains([eventType]),
                },
            });

            const attempts = subscriptions.map((subscription) =>
                deliveryAttemptRepository.create({
                    eventId: savedEvent.id,
                    subscriptionId: subscription.id,
                    status: WebhookDeliveryStatus.Pending,
                    attemptNumber: 1,
                }),
            );

            const savedAttempts = await deliveryAttemptRepository.save(attempts);

            return {
                event: savedEvent,
                deliveryAttempts: savedAttempts,
            };
        });

        if (result.deliveryAttempts.length === 0) {
            await this.webhookDeliveryService.refreshEventStatus(result.event.id);
        }

        const deliveredAttempts = result.deliveryAttempts.length > 0
            ? await this.webhookDeliveryService.deliverAttempts(result.deliveryAttempts)
            : [];

        const updatedEvent = await this.eventRepository.findOne({
            where: { id: result.event.id },
        });

        return {
            event: updatedEvent ?? result.event,
            deliveryAttempts: this.sanitizeDeliveryAttempts(deliveredAttempts),
        };
    }

    private sanitizeSubscription(subscription: WebhookSubscription) {
        const { secret, ...safeSubscription } = subscription;
        return safeSubscription;
    }

    private sanitizeCreatedSubscription(subscription: WebhookSubscription) {
        return {
            ...this.sanitizeSubscription(subscription),
            secret: subscription.secret,
        };
    }

    private sanitizeDeliveryAttempt(attempt: WebhookDeliveryAttempt | null) {
        if (!attempt) {
            return null;
        }

        return {
            id: attempt.id,
            subscriptionId: attempt.subscriptionId,
            eventId: attempt.eventId,
            status: attempt.status,
            attemptNumber: attempt.attemptNumber,
            httpStatusCode: attempt.httpStatusCode,
            responseBody: attempt.responseBody,
            errorMessage: attempt.errorMessage,
            nextRetryAt: attempt.nextRetryAt,
            deliveredAt: attempt.deliveredAt,
            createdAt: attempt.createdAt,
            updatedAt: attempt.updatedAt,
            subscription: attempt.subscription
                ? this.sanitizeSubscription(attempt.subscription)
                : undefined,
        };
    }

    private sanitizeDeliveryAttempts(attempts: (WebhookDeliveryAttempt | null)[]) {
        return attempts.map((attempt) => this.sanitizeDeliveryAttempt(attempt));
    }

    private sanitizeSubscriptions(subscriptions: WebhookSubscription[]) {
        return subscriptions.map(subscription => this.sanitizeSubscription(subscription));
    }

    private async findSubscriptionEntityById(id: string): Promise<WebhookSubscription> {
        const webhook = await this.subscriptionRepository.findOne({
            where: { id },
        });

        if (!webhook) {
            throw new NotFoundException(`Webhook with id "${id}" not found`);
        }

        return webhook;
    }

    private generateWebhookSecret(): string {
        return `whsec_${randomBytes(32).toString('hex')}`;
    }
}