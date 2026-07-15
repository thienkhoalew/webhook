import { ApiProperty } from "@nestjs/swagger";
import { WebhookEventStatus } from "../../enums/webhook-status.enum.js";

export class WebhookEventResponseDto {
    @ApiProperty({ example: '38c46729-0f5c-4b27-be64-f03d784c0a77' })
    id!: string;

    @ApiProperty({ example: 'payment.succeeded' })
    eventType!: string;

    @ApiProperty({
        example: {
            orderId: 'ord_123',
            amount: 500000,
            currency: 'VND',
        },
    })
    payload!: Record<string, unknown>;

    @ApiProperty({
        enum: WebhookEventStatus,
        example: WebhookEventStatus.Delivered,
    })
    status!: WebhookEventStatus;

    @ApiProperty({ example: '2026-06-29T09:46:57.589Z' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-06-29T09:46:57.589Z' })
    updatedAt!: Date;
}
