import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

type DeliveryAttemptStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'retrying';

@Entity('webhook_delivery_attempts')
@Index('idx_delivery_attempt_user_created', ['userId', 'createdAt'])
@Index('idx_delivery_attempt_event_created', ['eventId', 'createdAt'])
@Index('idx_delivery_attempt_subscription_created', [
  'subscriptionId',
  'createdAt',
])
@Index('idx_delivery_attempt_status_retry', ['status', 'nextRetryAt'])
export class DeliveryAttempt {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 255 })
  eventType!: string;

  @Column({ name: 'payload_snapshot', type: 'jsonb' })
  payloadSnapshot!: object;

  @Column({ name: 'event_created_at', type: 'timestamptz' })
  eventCreatedAt!: Date;

  @Column({ name: 'target_url', type: 'varchar', length: 2048 })
  targetUrl!: string;

  @Column({ name: 'secret_snapshot', type: 'text' })
  secretSnapshot!: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: DeliveryAttemptStatus;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
