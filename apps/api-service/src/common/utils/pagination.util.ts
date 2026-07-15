import { PaginationMetaDto } from "../dto/pagination-meta.dto.js";

export function buildPaginationMeta(
    page: number,
    limit: number,
    total: number,
): PaginationMetaDto {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    }
}