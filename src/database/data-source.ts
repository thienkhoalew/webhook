import 'dotenv/config';
import { DataSource } from 'typeorm';

import { WebhookDeliveryAttempt } from '../webhooks/entities/webhook-delivery-attempt.entity.js';
import { WebhookEvent } from '../webhooks/entities/webhook-event.entity.js';
import { WebhookSubscription } from '../webhooks/entities/webhook-subscription.entity.js';

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [
        WebhookSubscription,
        WebhookEvent,
        WebhookDeliveryAttempt,
    ],
    migrations: ['dist/database/migrations/*.js'],
    synchronize: false,
});