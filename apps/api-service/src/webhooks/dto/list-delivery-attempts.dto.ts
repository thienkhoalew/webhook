import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { WebhookDeliveryStatus } from "../enums/webhook-status.enum.js";

export class ListDeliveryAttemptsDto {
    @ApiPropertyOptional({ example: 1, type: Number, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page = 1;

    @ApiPropertyOptional({ example: 20, type: Number, minimum: 1, maximum: 100 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit = 20;

    @ApiPropertyOptional({ 
        example: WebhookDeliveryStatus.Failed, 
        type: String, 
        enum: WebhookDeliveryStatus
    })
    @IsEnum(WebhookDeliveryStatus)
    @IsOptional()
    status?: WebhookDeliveryStatus;

    @ApiPropertyOptional({ example: '9076ba0b-5ad7-45c9-960a-1c77b6943fab' })
    @IsUUID()
    @IsOptional()
    eventId?: string;

    @ApiPropertyOptional({ example: 'adae6b64-cc34-47aa-8ffb-7776c8d8a03c' })
    @IsUUID()
    @IsOptional()
    subscriptionId?: string;
}