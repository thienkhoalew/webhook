import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import type { DeliveryAttemptStatus } from '@webhook/contracts';

const DELIVERY_STATUSES: DeliveryAttemptStatus[] = [
  'pending',
  'success',
  'failed',
  'retrying',
];

export class InternalListDeliveryAttemptsDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsIn(DELIVERY_STATUSES)
  status?: DeliveryAttemptStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
