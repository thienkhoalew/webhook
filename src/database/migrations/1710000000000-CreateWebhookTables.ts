import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookTables1710000000000 implements MigrationInterface {
    name = 'CreateWebhookTables1710000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE webhook_subscriptions (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                url varchar(2048) NOT NULL,
                secret varchar(255) NOT NULL,
                event_types text[] NOT NULL,
                description varchar(255),
                is_active boolean NOT NULL DEFAULT true,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            )
        `);

        await queryRunner.query(`
            CREATE TABLE webhook_events (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                event_type varchar(255) NOT NULL,
                payload jsonb NOT NULL,
                status varchar(50) NOT NULL DEFAULT 'pending',
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            )
        `);

        await queryRunner.query(`
            CREATE TABLE webhook_delivery_attempts (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                subscription_id uuid NOT NULL,
                event_id uuid NOT NULL,
                status varchar(50) NOT NULL DEFAULT 'pending',
                attempt_number integer NOT NULL DEFAULT 1,
                http_status_code integer,
                response_body text,
                error_message text,
                next_retry_at timestamptz,
                delivered_at timestamptz,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT fk_webhook_delivery_attempts_subscription
                    FOREIGN KEY (subscription_id)
                    REFERENCES webhook_subscriptions(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_webhook_delivery_attempts_event
                    FOREIGN KEY (event_id)
                    REFERENCES webhook_events(id)
                    ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS webhook_delivery_attempts
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS webhook_events
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS webhook_subscriptions
        `);
    }
}
