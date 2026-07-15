import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { DeliveryServiceClient } from '../delivery-client/delivery-service.client.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { CreateWebhookEventDto } from './dto/create-webhook-event.dto.js';
import { CreateWebhookDto } from './dto/create-webhook.dto.js';
import { ListDeliveryAttemptsDto } from './dto/list-delivery-attempts.dto.js';
import { ListWebhookEventsDto } from './dto/list-webhook-events.dto.js';
import { CreatedWebhookSubscriptionResponseDto } from './dto/responses/created-webhook-subscription-response.dto.js';
import { PaginatedDeliveryAttemptsResponseDto } from './dto/responses/paginated-delivery-attempts-response.dto.js';
import { PaginatedWebhookEventsResponseDto } from './dto/responses/paginated-webhook-events-response.dto.js';
import { WebhookDeliveryAttemptResponseDto } from './dto/responses/webhook-delivery-attempt-response.dto.js';
import { WebhookSubscriptionResponseDto } from './dto/responses/webhook-subscription-response.dto.js';
import { UpdateWebhookDto } from './dto/update-webhook.dto.js';
import { WebhooksService } from './webhooks.service.js';

@ApiTags('webhooks')
@Controller('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhooksController {
  constructor(
    private readonly webhooks: WebhooksService,
    private readonly deliveryClient: DeliveryServiceClient,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook subscription' })
  @ApiBody({ type: CreateWebhookDto })
  @ApiCreatedResponse({ type: CreatedWebhookSubscriptionResponseDto })
  create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhooks.createSubscription(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all webhook subscriptions' })
  @ApiOkResponse({ type: [WebhookSubscriptionResponseDto] })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.webhooks.findAllSubscriptions(user);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create a webhook event and queue deliveries' })
  @ApiBody({ type: CreateWebhookEventDto })
  @ApiCreatedResponse()
  createEvent(
    @Body() dto: CreateWebhookEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhooks.createEventWithDeliveryAttempts(
      dto.eventType,
      dto.payload,
      user,
    );
  }

  @Get('events')
  @ApiOperation({ summary: 'List webhook events' })
  @ApiOkResponse({ type: PaginatedWebhookEventsResponseDto })
  findEvents(
    @Query() query: ListWebhookEventsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhooks.findEvents(query, user);
  }

  @Get('delivery-attempts')
  @ApiOperation({ summary: 'List webhook delivery attempts' })
  @ApiOkResponse({ type: PaginatedDeliveryAttemptsResponseDto })
  findDeliveryAttempts(
    @Query() query: ListDeliveryAttemptsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryClient.findAttempts({
      ...query,
      userId: user.role === UserRole.Admin ? undefined : user.id,
    });
  }

  @Post('delivery-attempts/:id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Queue a webhook delivery attempt retry' })
  @ApiParam({ name: 'id', description: 'Webhook delivery attempt UUID' })
  @ApiOkResponse({ type: WebhookDeliveryAttemptResponseDto })
  retryDeliveryAttempt(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryClient.retryAttempt(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook subscription by id' })
  @ApiParam({ name: 'id', description: 'Webhook subscription UUID' })
  @ApiOkResponse({ type: WebhookSubscriptionResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhooks.findSubscriptionById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webhook subscription by id' })
  @ApiBody({ type: UpdateWebhookDto })
  @ApiOkResponse({ type: WebhookSubscriptionResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhooks.updateSubscription(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook subscription by id' })
  @ApiOkResponse({ type: WebhookSubscriptionResponseDto })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhooks.removeSubscription(id, user);
  }
}
