import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryOutboxAndEventCount1740000001000 implements MigrationInterface {
  name = 'AddDeliveryOutboxAndEventCount1740000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE webhook_events
      ADD COLUMN expected_delivery_count integer,
      ADD CONSTRAINT chk_webhook_events_expected_delivery_count
        CHECK (expected_delivery_count IS NULL OR expected_delivery_count >= 0)
    `);
    await queryRunner.query(`
      CREATE TABLE webhook_delivery_outbox (
        attempt_id uuid PRIMARY KEY,
        event_id uuid NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
        command jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_webhook_delivery_outbox_created
      ON webhook_delivery_outbox (created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_webhook_events_processing_updated
      ON webhook_events (updated_at)
      WHERE status = 'processing'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_webhook_events_processing_updated',
    );
    await queryRunner.query('DROP TABLE IF EXISTS webhook_delivery_outbox');
    await queryRunner.query(`
      ALTER TABLE webhook_events
      DROP CONSTRAINT IF EXISTS chk_webhook_events_expected_delivery_count,
      DROP COLUMN IF EXISTS expected_delivery_count
    `);
  }
}
