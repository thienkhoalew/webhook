import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWebhookIndexes1720000000000 implements MigrationInterface {
    name = 'AddWebhookIndexes1720000000000';
    
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active_event_types
            ON webhook_subscriptions
            USING GIN (event_types)
            WHERE is_active = true
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type_created_at
            ON webhook_events (event_type, created_at DESC)
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_webhook_events_status_created_at
            ON webhook_events (status, created_at ASC)
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_event_id
            ON webhook_delivery_attempts (event_id)
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_retry_queue
            ON webhook_delivery_attempts (next_retry_at ASC)
            WHERE status = 'retrying'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_webhook_delivery_attempts_retry_queue
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_webhook_delivery_attempts_event_id
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_webhook_events_status_created_at
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_webhook_events_event_type_created_at
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_webhook_subscriptions_active_event_types
        `);
    }
}