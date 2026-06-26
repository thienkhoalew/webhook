import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import { WebhookDeliveryAttempt } from "./webhook-delivery-attempt.entity.js";
import { WebhookEventStatus } from "../enums/webhook-status.enum.js";

@Entity('webhook_events')
export class WebhookEvent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'event_type', type: 'varchar', length: 255 })
    eventType!: string;

    @Column({ type: 'jsonb' })
    payload!: Record<string, unknown>;

    @Column({ type: 'varchar', length: 50, default: WebhookEventStatus.Pending })
    status!: WebhookEventStatus;

    @OneToMany(
        () => WebhookDeliveryAttempt,
        (attempt) => attempt.event,
    )
    deliveryAttempts!: WebhookDeliveryAttempt[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}