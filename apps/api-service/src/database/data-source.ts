import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from '../users/entities/user.entity.js';
import { WebhookDeliveryOutbox } from '../webhooks/entities/webhook-delivery-outbox.entity.js';
import { WebhookEvent } from '../webhooks/entities/webhook-event.entity.js';
import { WebhookSubscription } from '../webhooks/entities/webhook-subscription.entity.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.API_DB_HOST ?? 'localhost',
  port: Number(process.env.API_DB_PORT ?? 5432),
  username: process.env.API_DB_USERNAME,
  password: process.env.API_DB_PASSWORD,
  database: process.env.API_DB_DATABASE,
  entities: [User, WebhookSubscription, WebhookEvent, WebhookDeliveryOutbox],
  migrations: [
    `${process.cwd()}/dist/apps/api-service/database/migrations/*.js`,
  ],
  synchronize: false,
});
