import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeliveryAttempts1740000000000
  implements MigrationInterface
{
  name = 'CreateDeliveryAttempts1740000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE webhook_delivery_attempts (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        event_id uuid NOT NULL,
        subscription_id uuid NOT NULL,
        event_type varchar(255) NOT NULL,
        payload_snapshot jsonb NOT NULL,
        event_created_at timestamptz NOT NULL,
        target_url varchar(2048) NOT NULL,
        secret_snapshot text NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        attempt_number integer NOT NULL DEFAULT 1,
        http_status_code integer,
        response_body text,
        error_message text,
        next_retry_at timestamptz,
        delivered_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_attempt_user_created
      ON webhook_delivery_attempts (user_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_attempt_event_created
      ON webhook_delivery_attempts (event_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_attempt_subscription_created
      ON webhook_delivery_attempts (subscription_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_attempt_status_retry
      ON webhook_delivery_attempts (status, next_retry_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS webhook_delivery_attempts');
  }
}
