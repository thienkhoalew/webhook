import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { WebhookDeliveryAttempt } from "./webhook-delivery-attempt.entity.js";

@Entity('webhook_subscriptions')
export class WebhookSubscription {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 2048 })
    url!: string;

    @Column({ type: 'varchar', length: 255 })
    secret!: string;

    @Column({
        name: 'event_types',
        type: 'text',
        array: true,
    })
    eventTypes!: string[];

    @Column({ type: 'varchar', length: 255, nullable: true })
    description!: string | null;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive!: boolean;

    @OneToMany(
        () => WebhookDeliveryAttempt,
        (attempt) => attempt.subscription,
    )
    deliveryAttempts!: WebhookDeliveryAttempt[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}