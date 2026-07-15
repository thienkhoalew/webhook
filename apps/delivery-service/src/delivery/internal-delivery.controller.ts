import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { DeliveryAttemptService } from './delivery-attempt.service.js';
import { InternalListDeliveryAttemptsDto } from './dto/internal-list-delivery-attempts.dto.js';
import { InternalServiceTokenGuard } from './internal-service-token.guard.js';
import { DeliveryQueueService } from './queue/delivery-queue.service.js';

@Controller('internal/delivery-attempts')
@UseGuards(InternalServiceTokenGuard)
export class InternalDeliveryController {
  constructor(
    private readonly attempts: DeliveryAttemptService,
    private readonly queue: DeliveryQueueService,
  ) {}

  @Get()
  findAttempts(@Query() query: InternalListDeliveryAttemptsDto) {
    return this.attempts.findAttempts(query);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    const attempt = await this.attempts.prepareRetry(id);
    await this.queue.enqueueRetry(id);
    return attempt;
  }
}
