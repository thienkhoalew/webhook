import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiSchema1740000000000 implements MigrationInterface {
  name = 'CreateApiSchema1740000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email varchar(255) NOT NULL UNIQUE,
        password_hash varchar(255),
        role varchar(50) NOT NULL DEFAULT 'user',
        provider varchar(50) NOT NULL DEFAULT 'local',
        google_id varchar(255) UNIQUE,
        display_name varchar(255),
        avatar_url text,
        email_verified boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        last_login_at timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE webhook_subscriptions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type varchar(255) NOT NULL,
        payload jsonb NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_webhook_subscriptions_active_event_types
      ON webhook_subscriptions USING GIN (event_types) WHERE is_active = true
    `);
    await queryRunner.query(`
      CREATE INDEX idx_webhook_subscriptions_user
      ON webhook_subscriptions (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_webhook_events_user_created
      ON webhook_events (user_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_webhook_events_type_created
      ON webhook_events (event_type, created_at DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS webhook_events');
    await queryRunner.query('DROP TABLE IF EXISTS webhook_subscriptions');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
