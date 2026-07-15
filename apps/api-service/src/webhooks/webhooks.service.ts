import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { ArrayContains, DataSource, Repository } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';

import {
  DELIVERY_COMMAND_VERSION,
  type DeliverWebhookV1,
} from '@webhook/contracts';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { buildPaginationMeta } from '../common/utils/pagination.util.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { CreateWebhookDto } from './dto/create-webhook.dto.js';
import { ListWebhookEventsDto } from './dto/list-webhook-events.dto.js';
import { UpdateWebhookDto } from './dto/update-webhook.dto.js';
import { WebhookEvent } from './entities/webhook-event.entity.js';
import { WebhookSubscription } from './entities/webhook-subscription.entity.js';
import { WebhookEventStatus } from './enums/webhook-status.enum.js';
import { WebhookQueueService } from './queue/webhook-queue.service.js';

const ATTEMPT_ID_NAMESPACE = '9bf635a4-b4e3-4a6b-a2a8-3a56d59975dd';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepository: Repository<WebhookSubscription>,
    @InjectRepository(WebhookEvent)
    private readonly eventRepository: Repository<WebhookEvent>,
    private readonly queue: WebhookQueueService,
    private readonly dataSource: DataSource,
  ) {}

  async createSubscription(dto: CreateWebhookDto, user: AuthenticatedUser) {
    const subscription = this.subscriptionRepository.create({
      url: dto.url,
      eventTypes: dto.eventTypes,
      description: dto.description ?? null,
      secret: dto.secret ?? this.generateWebhookSecret(),
      isActive: true,
      userId: user.id,
    });
    return this.sanitizeCreatedSubscription(
      await this.subscriptionRepository.save(subscription),
    );
  }

  async findAllSubscriptions(user: AuthenticatedUser) {
    const subscriptions = await this.subscriptionRepository.find({
      where: user.role === UserRole.Admin ? {} : { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    return subscriptions.map((subscription) =>
      this.sanitizeSubscription(subscription),
    );
  }

  async findSubscriptionById(id: string, user: AuthenticatedUser) {
    const subscription = await this.findSubscriptionEntityById(id);
    this.ensureCanAccessSubscription(subscription, user);
    return this.sanitizeSubscription(subscription);
  }

  async updateSubscription(
    id: string,
    dto: UpdateWebhookDto,
    user: AuthenticatedUser,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Update body must contain at least one field',
      );
    }
    const subscription = await this.findSubscriptionEntityById(id);
    this.ensureCanAccessSubscription(subscription, user);
    Object.assign(subscription, dto);
    return this.sanitizeSubscription(
      await this.subscriptionRepository.save(subscription),
    );
  }

  async removeSubscription(id: string, user: AuthenticatedUser) {
    const subscription = await this.findSubscriptionEntityById(id);
    this.ensureCanAccessSubscription(subscription, user);
    await this.subscriptionRepository.remove(subscription);
    return this.sanitizeSubscription(subscription);
  }

  async findEvents(query: ListWebhookEventsDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (user.role !== UserRole.Admin) {
      queryBuilder.andWhere('event.userId = :userId', { userId: user.id });
    }
    if (query.status) {
      queryBuilder.andWhere('event.status = :status', {
        status: query.status,
      });
    }
    if (query.eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', {
        eventType: query.eventType,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async createEventWithDeliveryAttempts(
    eventType: string,
    payload: Record<string, unknown>,
    user: AuthenticatedUser,
  ) {
    // DB transaction and Redis enqueue cannot commit atomically. Deterministic
    // attempt IDs make a client retry safe when enqueue fails after event save.
    const result = await this.dataSource.transaction(async (manager) => {
      const eventRepository = manager.getRepository(WebhookEvent);
      const subscriptionRepository = manager.getRepository(WebhookSubscription);
      const subscriptions = await subscriptionRepository.find({
        where: {
          isActive: true,
          eventTypes: ArrayContains([eventType]),
          userId: user.id,
        },
      });
      const event = await eventRepository.save(
        eventRepository.create({
          eventType,
          payload,
          userId: user.id,
          status:
            subscriptions.length === 0
              ? WebhookEventStatus.NoSubscribers
              : WebhookEventStatus.Processing,
        }),
      );
      const commands = subscriptions.map<DeliverWebhookV1>((subscription) => ({
        version: DELIVERY_COMMAND_VERSION,
        attemptId: uuidv5(
          `${event.id}:${subscription.id}`,
          ATTEMPT_ID_NAMESPACE,
        ),
        event: {
          id: event.id,
          userId: event.userId,
          type: event.eventType,
          payload: event.payload,
          createdAt: event.createdAt.toISOString(),
        },
        subscription: {
          id: subscription.id,
          userId: subscription.userId,
          url: subscription.url,
          secret: subscription.secret,
        },
      }));
      return { event, commands };
    });

    await this.queue.enqueueMany(result.commands);
    return {
      event: result.event,
      deliveryAttempts: result.commands.map((command) => ({
        id: command.attemptId,
        eventId: command.event.id,
        subscriptionId: command.subscription.id,
        status: 'pending',
        attemptNumber: 1,
      })),
    };
  }

  private sanitizeSubscription(subscription: WebhookSubscription) {
    const { secret: _secret, ...safeSubscription } = subscription;
    return safeSubscription;
  }

  private sanitizeCreatedSubscription(subscription: WebhookSubscription) {
    return {
      ...this.sanitizeSubscription(subscription),
      secret: subscription.secret,
    };
  }

  private async findSubscriptionEntityById(
    id: string,
  ): Promise<WebhookSubscription> {
    const subscription = await this.subscriptionRepository.findOneBy({ id });
    if (!subscription) {
      throw new NotFoundException(`Webhook with id "${id}" not found`);
    }
    return subscription;
  }

  private generateWebhookSecret(): string {
    return `whsec_${randomBytes(32).toString('hex')}`;
  }

  private ensureCanAccessSubscription(
    subscription: WebhookSubscription,
    user: AuthenticatedUser,
  ): void {
    if (user.role !== UserRole.Admin && subscription.userId !== user.id) {
      throw new NotFoundException(
        `Webhook with id "${subscription.id}" not found`,
      );
    }
  }
}
