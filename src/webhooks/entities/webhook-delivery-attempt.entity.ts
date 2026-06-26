import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import { WebhookSubscription } from "./webhook-subscription.entity.js";
import { WebhookEvent } from "./webhook-event.entity.js";
import { WebhookDeliveryStatus } from "../enums/webhook-status.enum.js";

@Entity('webhook_delivery_attempts')
export class WebhookDeliveryAttempt {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'subscription_id', type: 'uuid' })
    subscriptionId!: string;

    @Column({ name: 'event_id', type: 'uuid' })
    eventId!: string;

    @Column({ type: 'varchar', length: 50, default: WebhookDeliveryStatus.Pending })
    status!: WebhookDeliveryStatus;

    @Column({ name: 'attempt_number', type: 'int', default: 1 })
    attemptNumber!: number;

    @Column({ name: 'http_status_code', type: 'int', nullable: true })
    httpStatusCode!: number | null;

    @Column({ name: 'response_body', type: 'text', nullable: true })
    responseBody!: string | null;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage!: string | null;

    @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
    nextRetryAt!: Date | null;

    @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
    deliveredAt!: Date | null;

    @ManyToOne(
        () => WebhookSubscription,
        (subscription) => subscription.deliveryAttempts,
        { onDelete: 'CASCADE' },
    )
    @JoinColumn({ name: 'subscription_id' })
    subscription!: WebhookSubscription;

    @ManyToOne(
        () => WebhookEvent,
        (event) => event.deliveryAttempts,
        { onDelete: 'CASCADE' },
    )
    @JoinColumn({ name: 'event_id' })
    event!: WebhookEvent;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}