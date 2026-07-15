export type DeliveryAttemptStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'retrying';

export interface DeliveryAttemptResponse {
  id: string;
  userId: string;
  eventId: string;
  subscriptionId: string;
  eventType: string;
  status: DeliveryAttemptStatus;
  attemptNumber: number;
  httpStatusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDeliveryAttemptsResponse {
  items: DeliveryAttemptResponse[];
  meta: PaginationMeta;
}

export interface DeliveryAttemptQuery {
  userId?: string;
  eventId?: string;
  subscriptionId?: string;
  status?: DeliveryAttemptStatus;
  page?: number;
  limit?: number;
}
