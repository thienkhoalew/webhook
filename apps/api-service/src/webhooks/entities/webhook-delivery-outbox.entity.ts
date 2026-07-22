import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { WebhookEvent } from './webhook-event.entity.js';

@Entity('webhook_delivery_outbox')
export class WebhookDeliveryOutbox {
  @PrimaryColumn({ name: 'attempt_id', type: 'uuid' })
  attemptId!: string;

  @Index()
  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @ManyToOne(() => WebhookEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event!: WebhookEvent;

  @Column({ type: 'jsonb' })
  command!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
