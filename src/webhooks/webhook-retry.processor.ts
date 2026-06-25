import { Injectable, Logger } from "@nestjs/common";
import { WebhookDeliveryService } from "./webhook-delivery.service.js";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class WebhookRetryProcessor {
    private readonly logger = new Logger(WebhookRetryProcessor.name);

    constructor(
        private readonly webhookDeliveryService: WebhookDeliveryService,
    ) {}

    @Cron('*/30 * * * * *')
    async retryDueAttempts() {
        const attempts = await this.webhookDeliveryService.findDueRetryAttempts(100);

        if(attempts.length === 0) {
            return;
        }

        this.logger.log(`Retrying ${attempts.length} webhook delivery attempts`);

        await Promise.all(attempts.map((attempt) => this.webhookDeliveryService.retryAttempt(attempt.id)));
    }
}