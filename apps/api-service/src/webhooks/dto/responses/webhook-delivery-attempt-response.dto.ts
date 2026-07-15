import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WebhookDeliveryStatus } from "../../enums/webhook-status.enum.js";

export class WebhookDeliveryAttemptResponseDto {
    @ApiProperty({ example: '039f2cdb-4b33-44a1-899c-55cdf86338c4' })
    id!: string;

    @ApiProperty({ example: '38c46729-0f5c-4b27-be64-f03d784c0a77' })
    eventId!: string;

    @ApiProperty({ example: 'f548e4b0-9a7b-4d64-9f9b-1a9074d020dc' })
    subscriptionId!: string;

    @ApiProperty({
        enum: WebhookDeliveryStatus,
        example: WebhookDeliveryStatus.Success,
    })
    status!: WebhookDeliveryStatus;

    @ApiProperty({ example: 1 })
    attemptNumber!: number;

    @ApiPropertyOptional({ example: 200, nullable: true })
    httpStatusCode?: number | null;

    @ApiPropertyOptional({ example: 'Ok', nullable: true })
    responseBody?: string | null;

    @ApiPropertyOptional({ example: 'Failed to connect to host', nullable: true })
    errorMessage?: string | null;

    @ApiPropertyOptional({ example: "2026-06-29T08:15:36.790Z", nullable: true })
    nextRetryAt?: string | null;

    @ApiPropertyOptional({ example: '2026-06-29T08:15:36.790Z', nullable: true })
    deliveredAt?: string | null;

    @ApiProperty({ example: '2026-06-29T08:15:36.790Z' })
    createdAt!: string;

    @ApiProperty({ example: '2026-06-29T08:15:36.790Z' })
    updatedAt!: string;
}