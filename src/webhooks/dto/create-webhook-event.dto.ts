import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class CreateWebhookEventDto {
    @ApiProperty({
        example: 'payment.succeeded',
        description: 'The type of the event (e.g., user.created)',
    })
    @IsString()
    @IsNotEmpty()
    eventType!: string;

    @ApiProperty({
        example: {
            orderId: 'ord_123',
            amount: 500000,
            currency: 'VND',
        },
        description: 'Payload for the event',
        type: 'object',
        additionalProperties: true,
    })
    @IsObject()
    payload!: Record<string, unknown>;
}