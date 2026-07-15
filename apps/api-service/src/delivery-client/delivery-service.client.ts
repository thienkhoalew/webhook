import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  DeliveryAttemptQuery,
  DeliveryAttemptResponse,
  PaginatedDeliveryAttemptsResponse,
} from '@webhook/contracts';

@Injectable()
export class DeliveryServiceClient {
  private readonly baseUrl: string;
  private readonly serviceToken: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('DELIVERY_SERVICE_URL') ?? 'http://localhost:3001'
    ).replace(/\/$/, '');
    this.serviceToken = config.get<string>('INTERNAL_SERVICE_TOKEN') ?? '';
    this.timeoutMs = config.get<number>('DELIVERY_SERVICE_TIMEOUT_MS') ?? 3000;
  }

  async findAttempts(
    query: DeliveryAttemptQuery,
  ): Promise<PaginatedDeliveryAttemptsResponse> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        search.set(key, String(value));
      }
    }

    return this.request<PaginatedDeliveryAttemptsResponse>(
      `/internal/delivery-attempts?${search.toString()}`,
      { method: 'GET' },
    );
  }

  async retryAttempt(id: string): Promise<DeliveryAttemptResponse> {
    return this.request<DeliveryAttemptResponse>(
      `/internal/delivery-attempts/${encodeURIComponent(id)}/retry`,
      { method: 'POST' },
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.serviceToken}`,
          ...init.headers,
        },
      });

      const body = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null;
      if (!response.ok) {
        throw new BadGatewayException({
          message: 'Delivery service request failed',
          statusCode: response.status,
          details: body,
        });
      }

      return body as T;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException('Delivery service request timed out');
      }
      throw new BadGatewayException('Delivery service is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
