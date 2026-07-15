import { ApiProperty } from "@nestjs/swagger";
import { WebhookDeliveryAttemptResponseDto } from "./webhook-delivery-attempt-response.dto.js";
import { PaginationMetaDto } from "../../../common/dto/pagination-meta.dto.js";

export class PaginatedDeliveryAttemptsResponseDto {
    @ApiProperty({ type: [WebhookDeliveryAttemptResponseDto] })
    items!: WebhookDeliveryAttemptResponseDto[];

    @ApiProperty({ type: PaginationMetaDto })
    meta!: PaginationMetaDto;
}