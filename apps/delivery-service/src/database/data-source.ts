import 'dotenv/config';
import { DataSource } from 'typeorm';

import { DeliveryAttempt } from '../delivery/entities/delivery-attempt.entity.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DELIVERY_DB_HOST ?? 'localhost',
  port: Number(process.env.DELIVERY_DB_PORT ?? 5433),
  username: process.env.DELIVERY_DB_USERNAME,
  password: process.env.DELIVERY_DB_PASSWORD,
  database: process.env.DELIVERY_DB_DATABASE,
  entities: [DeliveryAttempt],
  migrations: [
    `${process.cwd()}/dist/apps/delivery-service/database/migrations/*.js`,
  ],
  synchronize: false,
});
