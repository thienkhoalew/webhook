import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CreateWebhookDto } from "./dto/create-webhook.dto.js";
import { CreateWebhookEventDto } from "./dto/create-webhook-event.dto.js";
import { WebhooksService } from "./webhooks.service.js";
import { UpdateWebhookDto } from "./dto/update-webhook.dto.js";
import { ListWebhookEventsDto } from "./dto/list-webhook-events.dto.js";
import { ListDeliveryAttemptsDto } from "./dto/list-delivery-attempts.dto.js";
import { WebhookDeliveryService } from "./webhook-delivery.service.js";

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
    constructor(
        private readonly webhooksService: WebhooksService,
        private readonly webhookDeliveryService: WebhookDeliveryService,
    ) { }

    @ApiOperation({ summary: 'Create a new webhook subscription' })
    @ApiBody({ type: CreateWebhookDto })
    @ApiCreatedResponse({ description: 'Webhook subscription created successfully' })
    @Post()
    create(@Body() dto: CreateWebhookDto) {
        return this.webhooksService.createSubscription(dto);
    }

    @ApiOperation({ summary: 'Get all webhook subscriptions' })
    @ApiOkResponse({ description: 'Get all webhook subscriptions' })
    @Get()
    findAll() {
        return this.webhooksService.findAllSubscriptions();
    }

    @ApiOperation({ summary: 'Create a new webhook event and delivery attempts' })
    @ApiBody({ type: CreateWebhookEventDto })
    @ApiCreatedResponse({
        description: 'Webhook event created successfully and delivery attempts created for subscriptions that have that event type',
    })
    @Post('events')
    createEvent(@Body() dto: CreateWebhookEventDto) {
        return this.webhooksService.createEventWithDeliveryAttempts(
            dto.eventType,
            dto.payload,
        );
    }

    @Get('events')
    @ApiOperation({ summary: 'List webhook events' })
    async findEvents(@Query() query: ListWebhookEventsDto) {
        return this.webhooksService.findEvents(query);
    }

    @Get('delivery-attempts')
    @ApiOperation({ summary: 'List webhook delivery attempts' })
    @ApiOkResponse({ description: 'Webhook delivery attempts listed successfully' })
    async findDeliveryAttempts(@Query() query: ListDeliveryAttemptsDto) {
        return this.webhookDeliveryService.findDeliveryAttempts(query);
    }

    @ApiOperation({ summary: 'Get webhook subscription by id' })
    @ApiParam({ name: 'id', description: 'Webhook subscription id format uuid' })
    @ApiOkResponse({ description: 'Webhook subscription found' })
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.webhooksService.findSubscriptionById(id);
    }

    @ApiOperation({ summary: 'Update webhook subscription by id' })
    @ApiParam({ name: 'id', description: 'Webhook subscription id format uuid' })
    @ApiBody({ type: UpdateWebhookDto })
    @ApiOkResponse({ description: 'Webhook subscription after updated' })
    @Patch(':id')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWebhookDto) {
        return this.webhooksService.updateSubscription(id, dto);
    }

    @ApiOperation({ summary: 'Delete webhook subscription by id' })
    @ApiParam({ name: 'id', description: 'Webhook subscription id format uuid' })
    @ApiOkResponse({ description: 'Webhook subscription deleted successfully' })
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.webhooksService.removeSubscription(id);
    }
}
