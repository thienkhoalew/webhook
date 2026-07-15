import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class WebhookSubscriptionResponseDto {
    @ApiProperty({ example: 'f548e4b0-9a7b-4d64-9f9b-1a9074d020dc' })
    id!: string;

    @ApiProperty({ example: 'https://example.com/webhook' })
    url!: string;

    @ApiProperty({ example: ['payment.succeeded'] })
    eventTypes!: string[];

    @ApiPropertyOptional({ example: 'This is a description', nullable: true })
    description?: string | null;

    @ApiProperty({ example: true })
    isActive!: boolean;

    @ApiProperty({ example: '2026-06-29T09:46:57.589Z' })
    createdAt!: string;

    @ApiProperty({ example: '2026-06-29T09:46:57.589Z' })
    updatedAt!: string;
}