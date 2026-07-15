import { ApiProperty } from "@nestjs/swagger";
import { WebhookSubscriptionResponseDto } from "./webhook-subscription-response.dto.js";

export class CreatedWebhookSubscriptionResponseDto extends WebhookSubscriptionResponseDto {
    @ApiProperty({ example: 'whsec_1234567890abcdef...' })
    secret!: string;
}