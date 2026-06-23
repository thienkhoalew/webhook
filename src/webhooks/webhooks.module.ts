import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller.js";
import { WebhooksService } from "./webhooks.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebhookSubscription } from "./entities/webhook-subscription.entity.js";
import { WebhookDeliveryAttempt } from "./entities/webhook-delivery-attempt.entity.js";
import { WebhookEvent } from "./entities/webhook-event.entity.js";
import { WebhookDeliveryService } from "./webhook-delivery.service.js";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            WebhookSubscription,
            WebhookEvent,
            WebhookDeliveryAttempt,
        ])
    ],
    controllers: [WebhooksController],
    providers: [WebhooksService, WebhookDeliveryService],
})
export class WebhooksModule { }