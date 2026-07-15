import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';

import { InternalServiceTokenGuard } from './internal-service-token.guard.js';

function context(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as ExecutionContext;
}

describe('InternalServiceTokenGuard', () => {
  const config = {
    get: () => 'shared-secret',
  } as unknown as ConfigService;
  const guard = new InternalServiceTokenGuard(config);

  it('accepts matching bearer token', () => {
    expect(guard.canActivate(context('Bearer shared-secret'))).toBe(true);
  });

  it.each([undefined, 'Bearer wrong', 'shared-secret'])(
    'rejects invalid authorization %s',
    (authorization) => {
      expect(() => guard.canActivate(context(authorization))).toThrow(
        UnauthorizedException,
      );
    },
  );
});
