import { isDeliverWebhookV1 } from './delivery-command.js';

const command = {
  version: 1 as const,
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

describe('DeliverWebhookV1 contract', () => {
  it('accepts version 1 snapshots', () => {
    expect(isDeliverWebhookV1(command)).toBe(true);
  });

  it('rejects unsupported versions', () => {
    expect(isDeliverWebhookV1({ ...command, version: 2 })).toBe(false);
  });

  it('rejects commands missing secret snapshot', () => {
    expect(
      isDeliverWebhookV1({
        ...command,
        subscription: { ...command.subscription, secret: undefined },
      }),
    ).toBe(false);
  });
});
