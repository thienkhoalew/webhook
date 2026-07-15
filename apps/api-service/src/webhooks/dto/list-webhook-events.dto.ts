import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { WebhookEventStatus } from "../enums/webhook-status.enum.js";

export class ListWebhookEventsDto {
    @ApiPropertyOptional({ example: 1, minimum: 1, type: Number })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page = 1;

    @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, type: Number })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit = 20;

    @ApiPropertyOptional({
        enum: WebhookEventStatus,
        example: WebhookEventStatus.Delivered,
    })
    @IsEnum(WebhookEventStatus)
    @IsOptional()
    status?: WebhookEventStatus;
    
    @ApiPropertyOptional({ example: 'payment.succeeded', type: String })
    @IsString()
    @IsOptional()
    eventType?: string;
}