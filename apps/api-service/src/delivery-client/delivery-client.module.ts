import { Module } from '@nestjs/common';

import { DeliveryServiceClient } from './delivery-service.client.js';

@Module({
  providers: [DeliveryServiceClient],
  exports: [DeliveryServiceClient],
})
export class DeliveryClientModule {}
