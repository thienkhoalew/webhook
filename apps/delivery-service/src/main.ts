import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { DeliveryModule } from './delivery.module.js';

async function bootstrap() {
  const app = await NestFactory.create(DeliveryModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.DELIVERY_PORT ?? 3001;
  await app.listen(port);
}

void bootstrap();
