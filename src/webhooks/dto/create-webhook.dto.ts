import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsArray, IsOptional, ArrayMinSize, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateWebhookDto {
    @ApiProperty({
        example: ['payment.succeeded', 'order.created'],
        description: 'Event types that the webhook will subscribe to',
        type: [String],
    })
    @IsString({ each: true })
    @IsArray()
    @ArrayMinSize(1)
    eventTypes!: string[];

    @ApiPropertyOptional({
        example: 'Webhook of shop A',
        description: 'Description of the webhook subscription',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @ApiProperty({
        example: 'https://client.example.com/webhooks',
        description: 'URL to receive webhooks. Must have http/https protocol',
    })
    @IsUrl({ require_protocol: true })
    @IsNotEmpty()
    url!: string;

    @ApiPropertyOptional({
        example: 'whsec_abc123',
        description: 'Secret to sign webhooks. If not provided, server will generate one',
    })
    @IsOptional()
    @IsString()
    secret?: string;
}
