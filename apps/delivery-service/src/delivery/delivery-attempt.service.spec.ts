import type { Repository } from 'typeorm';

import type { DeliverWebhookV1 } from '@webhook/contracts';
import { DeliveryAttemptService } from './delivery-attempt.service.js';
import type { DeliveryAttempt } from './entities/delivery-attempt.entity.js';

const command: DeliverWebhookV1 = {
  version: 1,
  attemptId: '039f2cdb-4b33-44a1-899c-55cdf86338c4',
  event: {
    id: '38c46729-0f5c-4b27-be64-f03d784c0a77',
    userId: '9076ba0b-5ad7-45c9-960a-1c77b6943fab',
    type: 'order.created',
    payload: { orderId: '123' },
    createdAt: '2026-07-15T00:00:00.000Z',
  },
  subscription: {
    id: 'f548e4b0-9a7b-4d64-9f9b-1a9074d020dc',
    userId: '9076ba0b-5ad7-45c9-960a-1c77b6943fab',
    url: 'https://example.com/webhooks',
    secret: 'whsec_secret',
  },
};

describe('DeliveryAttemptService idempotency', () => {
  it('uses insert-or-ignore and returns same attempt', async () => {
    const execute = jest.fn().mockResolvedValue({ identifiers: [] });
    const builder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute,
    };
    const existing = { id: command.attemptId } as DeliveryAttempt;
    const repository = {
      create: jest.fn((attempt: DeliveryAttempt) => attempt),
      createQueryBuilder: jest.fn(() => builder),
      findOneBy: jest.fn().mockResolvedValue(existing),
    } as unknown as Repository<DeliveryAttempt>;
    const service = new DeliveryAttemptService(repository, {} as never);

    await expect(service.upsertFromCommand(command)).resolves.toBe(existing);
    await expect(service.upsertFromCommand(command)).resolves.toBe(existing);
    expect(builder.orIgnore).toHaveBeenCalledTimes(2);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      id: command.attemptId,
    });
  });
});
