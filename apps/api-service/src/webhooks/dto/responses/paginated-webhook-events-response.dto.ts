import { ApiProperty } from "@nestjs/swagger";
import { WebhookEventResponseDto } from "./webhook-event-response.dto.js";
import { PaginationMetaDto } from "../../../common/dto/pagination-meta.dto.js";

export class PaginatedWebhookEventsResponseDto {
    @ApiProperty({ type: [WebhookEventResponseDto] })
    items!: WebhookEventResponseDto[];

    @ApiProperty({ type: PaginationMetaDto })
    meta!: PaginationMetaDto;
}