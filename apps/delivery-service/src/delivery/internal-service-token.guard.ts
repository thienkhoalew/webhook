import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class InternalServiceTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN') ?? '';
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const authorization = request.headers.authorization;
    const received = Array.isArray(authorization)
      ? ''
      : (authorization?.match(/^Bearer (.+)$/)?.[1] ?? '');

    if (!expected || !this.matches(received, expected)) {
      throw new UnauthorizedException('Invalid internal service token');
    }

    return true;
  }

  private matches(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    );
  }
}
