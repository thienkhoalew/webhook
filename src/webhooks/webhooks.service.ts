import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateWebhookDto } from "./dto/create-webhook.dto.js";
import { randomUUID } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { ArrayContains, DataSource, Repository } from "typeorm";
import { WebhookSubscription } from "./entities/webhook-subscription.entity.js";
import { WebhookEvent } from "./entities/webhook-event.entity.js";
import { WebhookDeliveryAttempt } from "./entities/webhook-delivery-attempt.entity.js";
import { UpdateWebhookDto } from "./dto/update-webhook.dto.js";

@Injectable()
export class WebhooksService {

    constructor(
        @InjectRepository(WebhookSubscription)
        private readonly subscriptionRepository: Repository<WebhookSubscription>,

        @InjectRepository(WebhookEvent)
        private readonly eventRepository: Repository<WebhookEvent>,

        @InjectRepository(WebhookDeliveryAttempt)
        private readonly deliveryAttemptRepository: Repository<WebhookDeliveryAttempt>,

        private readonly dataSource: DataSource,
    ) {}

    async createSubscription( dto: CreateWebhookDto ) {
        const webhook = this.subscriptionRepository.create({
            url: dto.url,
            eventTypes: dto.eventTypes,
            description: dto.description ?? null,
            secret: dto.secret ?? randomUUID(),
            isActive: true,
        });

        return this.subscriptionRepository.save(webhook);
    }

    async createDeliveryAttemptsForEvent( event: WebhookEvent ) {
        const subscriptions = await this.findActiveSubscriptionsForEvent(event.eventType);

        const attempts = subscriptions.map((subscription) =>
            this.deliveryAttemptRepository.create({
                eventId: event.id,
                subscriptionId: subscription.id,
                status: 'pending',
                attemptNumber: 1,
            }),
        );

        return this.deliveryAttemptRepository.save(attempts);
    }

    async findAllSubscriptions() {
        return this.subscriptionRepository.find({
            order: {
                createdAt: "DESC",
            },
        });
    }

    async findSubscriptionById( id: string ) {
        const webhook = await this.subscriptionRepository.findOne({ where: { id } });

        if (!webhook) {
            throw new NotFoundException(`Webhook with id "${id}" not found`);
        }
        return webhook;
    }

    async updateSubscription( id: string, dto: UpdateWebhookDto ) {
        if (Object.keys(dto).length === 0) {
            throw new BadRequestException('Update body must contain at least one field');
        }

        const webhook = await this.findSubscriptionById(id);
        Object.assign(webhook, dto, { updatedAt: new Date() });
        return this.subscriptionRepository.save(webhook);
    }

    async removeSubscription( id: string ) {
        const webhook = await this.findSubscriptionById(id);
        await this.subscriptionRepository.remove(webhook);
        return webhook;
    }

    async createEvent( eventType: string, payload: Record<string, unknown> ) {
        const event = this.eventRepository.create({
            eventType,
            payload,
            status: 'pending',
        });

        return this.eventRepository.save(event);
    }

    async findActiveSubscriptionsForEvent( eventType: string ) {
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
        return this.dataSource.transaction(async (manager) => {
            const eventRepository = manager.getRepository(WebhookEvent);
            const deliveryAttemptRepository = manager.getRepository(WebhookDeliveryAttempt);
            const subscriptionRepository = manager.getRepository(WebhookSubscription);

            const event = eventRepository.create({
                eventType,
                payload,
                status: 'pending',
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
                    status: 'pending',
                    attemptNumber: 1,
                }),
            );

            const savedAttempts = await deliveryAttemptRepository.save(attempts);

            return {
                event: savedEvent,
                deliveryAttempts: savedAttempts
            };
        });
    }
}