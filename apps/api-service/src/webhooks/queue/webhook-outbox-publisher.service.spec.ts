import { WebhookOutboxPublisher } from './webhook-outbox-publisher.service.js';

describe('WebhookOutboxPublisher', () => {
  it('keeps outbox row when queue enqueue fails', async () => {
    const row = {
      attemptId: 'attempt-1',
      command: { attemptId: 'attempt-1' },
    };
    const outbox = {
      find: jest.fn().mockResolvedValue([row]),
      delete: jest.fn(),
    };
    const queue = {
      enqueue: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
    };
    const publisher = new WebhookOutboxPublisher(
      outbox as never,
      queue as never,
    );

    await publisher.publishPending();

    expect(queue.enqueue).toHaveBeenCalledWith(row.command);
    expect(outbox.delete).not.toHaveBeenCalled();
  });

  it('keeps outbox row after enqueue so terminal reconciliation can delete it', async () => {
    const row = {
      attemptId: 'attempt-1',
      command: { attemptId: 'attempt-1' },
    };
    const outbox = {
      find: jest.fn().mockResolvedValue([row]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const queue = { enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const publisher = new WebhookOutboxPublisher(
      outbox as never,
      queue as never,
    );

    await publisher.publishPending();

    expect(queue.enqueue).toHaveBeenCalledWith(row.command);
    expect(outbox.delete).not.toHaveBeenCalled();
  });
});
