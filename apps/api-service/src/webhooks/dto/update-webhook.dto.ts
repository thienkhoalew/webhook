import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateWebhookDto } from "./create-webhook.dto.js";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {
    @ApiPropertyOptional({
        example: true,
        description: 'Whether the webhook subscription is active',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}