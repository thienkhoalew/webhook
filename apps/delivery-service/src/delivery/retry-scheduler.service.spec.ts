import { RetrySchedulerService } from './retry-scheduler.service.js';

describe('RetrySchedulerService', () => {
  it('keeps database state unchanged when queue enqueue fails', async () => {
    const attempt = {
      id: 'attempt-1',
      attemptNumber: 2,
      status: 'retrying',
    };
    const attempts = {
      findDueRetries: jest.fn().mockResolvedValue([attempt]),
      prepareRetry: jest.fn(),
    };
    const queue = {
      enqueueRetry: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
    };
    const service = new RetrySchedulerService(
      attempts as never,
      queue as never,
    );

    await service.enqueueDueRetries();

    expect(queue.enqueueRetry).toHaveBeenCalledWith('attempt-1', 3);
    expect(attempts.prepareRetry).not.toHaveBeenCalled();
  });
});
